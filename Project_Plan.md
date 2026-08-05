# PDF → Templated Excel Converter — Project Plan

**Scope:** internal tool, 1–3 users, $0/month infrastructure budget.

---

## 1. Goal

Users upload a PDF (invoice, report, or similar). The system extracts the data with AI-assisted OCR and writes it into a fixed, pre-styled Excel template — preserving formatting, merged cells, and layout — then returns a downloadable `.xlsx`.

---

## 2. Final stack

| Layer | Service | Role | Cost |
|---|---|---|---|
| Frontend | Vercel (Hobby) | React upload/preview/download UI | Free |
| API + worker | Render (free web service) | Handles uploads, runs extraction + Excel generation | Free (750 hrs/mo) |
| Database | Aiven MySQL (free tier) / local MariaDB in dev | Job records, status, metadata | Free |
| Queue | Aiven Valkey (Redis-compatible, free tier) | Push-based job queue (`BRPOP`) | Free |
| File storage | Cloudinary (free tier, `resource_type: raw`) | Stores uploaded PDFs and generated `.xlsx` results | Free (25 credits/mo) |
| Extraction | Gemini API (Flash tier, free) | AI-assisted OCR + structured JSON extraction | Free (1,500 req/day) |
| Excel generation | ExcelJS (npm package) | Loads template, writes values, preserves formatting | Free (open source) |

No AWS/Azure/GCP OCR service, no Redis you have to self-host, no S3 — everything above has a genuinely permanent free tier at this scale, not a time-limited trial.

---

## 3. Architecture / data flow

1. **Upload** — React (Vercel) sends the PDF to `POST /api/convert` on the Render API.
2. **Store original** — Render uploads the PDF to Cloudinary as a `raw` resource, gets back a `secure_url` / `public_id`.
3. **Enqueue job** — Render inserts a row into the `jobs` table in Aiven MySQL (`status: pending`) and pushes `{ jobId, cloudinaryId, templateId }` onto the Aiven Valkey queue (`LPUSH jobs:queue`).
4. **Respond immediately** — API returns `{ jobId }` to the frontend. No blocking on OCR.
5. **Worker loop** (same Render service, separate process/loop) — blocks on `BRPOP jobs:queue`, pulls a job the moment one arrives.
6. **Extract** — Worker fetches the PDF from Cloudinary, sends it to Gemini Flash with a prompt requesting structured JSON matching the target schema (see §5).
7. **Sanity check** — Worker runs a lightweight validation (e.g. line items sum to stated total) before proceeding.
8. **Write Excel** — Worker loads the matching `.xlsx` template with ExcelJS, writes extracted values into the mapped cells, preserving all existing formatting.
9. **Store result** — Worker uploads the generated `.xlsx` back to Cloudinary as `raw`, updates the `jobs` row to `status: done` with the result URL.
10. **Download** — Frontend polls `GET /api/jobs/:id`; once `done`, shows the Cloudinary download link.

---

## 4. Database schema

```sql
CREATE TABLE jobs (
  id            CHAR(36)      PRIMARY KEY,        -- uuid
  status        ENUM('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
  template_id   VARCHAR(64)   NOT NULL,
  source_url    VARCHAR(512)  NOT NULL,            -- Cloudinary URL of uploaded PDF
  result_url    VARCHAR(512),                      -- Cloudinary URL of generated xlsx
  error_message TEXT,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Keep it this simple. At 1–3 users you don't need a `users` table unless you're adding auth — see §8 for whether that's worth doing.

---

## 5. Extraction: Gemini prompt → JSON → Excel

Define one schema per document type/template, and reuse the same shape for both the Gemini prompt and the ExcelJS cell mapping.

```js
// mapping-config.js — one entry per template
module.exports = {
  invoice: {
    file: 'templates/invoice-template.xlsx',
    schema: {
      invoiceNumber: 'string',
      invoiceDate: 'string',
      lineItems: [{ desc: 'string', qty: 'number', price: 'number' }]
    },
    cellMap: {
      invoiceNumber: 'B2',
      invoiceDate: 'B3',
      lineItems: { startRow: 8, columns: { desc: 'B', qty: 'C', price: 'D' } }
    }
  }
};
```

```js
// worker/extract.js
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extract(pdfBase64, schema) {
  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [{
      parts: [
        { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
        { text: `Extract fields matching this JSON schema exactly, no markdown fences:\n${JSON.stringify(schema)}` }
      ]
    }],
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
}
```

```js
// worker/write-excel.js
import ExcelJS from 'exceljs';

export async function writeExcel(templateFile, cellMap, data) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templateFile);
  const sheet = workbook.worksheets[0];

  sheet.getCell(cellMap.invoiceNumber).value = data.invoiceNumber;
  sheet.getCell(cellMap.invoiceDate).value = data.invoiceDate;

  data.lineItems.forEach((item, i) => {
    const row = cellMap.lineItems.startRow + i;
    sheet.getCell(`${cellMap.lineItems.columns.desc}${row}`).value = item.desc;
    sheet.getCell(`${cellMap.lineItems.columns.qty}${row}`).value = item.qty;
    sheet.getCell(`${cellMap.lineItems.columns.price}${row}`).value = item.price;
  });

  return workbook.xlsx.writeBuffer();
}
```

```js
// worker/index.js — the queue consumer
import { createClient } from 'redis';
import mysql from 'mysql2/promise';
import cloudinary from 'cloudinary';
import { extract } from './extract.js';
import { writeExcel } from './write-excel.js';
import mappingConfig from '../mapping-config.js';

const redis = createClient({ url: process.env.AIVEN_VALKEY_URL });
await redis.connect();
const db = await mysql.createConnection(process.env.AIVEN_MYSQL_URL);

while (true) {
  const job = await redis.brPop('jobs:queue', 0); // blocks until a job arrives
  const { jobId, cloudinaryId, templateId } = JSON.parse(job.element);

  try {
    await db.execute("UPDATE jobs SET status='processing' WHERE id=?", [jobId]);

    const config = mappingConfig[templateId];
    const pdfBuffer = await fetchFromCloudinary(cloudinaryId); // raw resource
    const extracted = await extract(pdfBuffer.toString('base64'), config.schema);

    const excelBuffer = await writeExcel(config.file, config.cellMap, extracted);
    const resultUrl = await uploadToCloudinary(excelBuffer, jobId, 'raw');

    await db.execute("UPDATE jobs SET status='done', result_url=? WHERE id=?", [resultUrl, jobId]);
  } catch (err) {
    await db.execute("UPDATE jobs SET status='failed', error_message=? WHERE id=?", [err.message, jobId]);
  }
}
```

---

## 5b. Template 1: Huawei Cloud Bill (concrete example)

First real template, based on the sample `Bill_Summary` PDF and its matching `Copy_Bill_Summary` xlsx.

**Target workbook structure** (inspected directly, not guessed):

`Summary` sheet — single-cell fields, no merges:

| Cell | Content | Format |
|---|---|---|
| A4 | `"HUAWEI CLOUD Bill"` (static label, don't overwrite) | text |
| A5 | Billing month, first-of-month date | `mmmm-yy` |
| B6 | Account name | text |
| D6 | Remaining amount due | `₱ #,##0.00` |
| B7 | Billing cycle string (e.g. `Jul 01, 2026~Jul 31, 2026`) | text |
| D7 | Bill amount | `₱ #,##0.00` |
| B8 | Export time string | text |
| D8 | Invoice number | text |
| A13 | Grand total | `₱ #,##0.00` |

`Resources` sheet — fixed 11-row category breakdown, `A1:B1` header row:

| Row | Category (col A, static) | Col B |
|---|---|---|
| 2 | Elastic Cloud Server | amount |
| 3 | Elastic Volume Service | amount |
| 4 | Web Application Firewall | amount |
| 5 | Cloud Certificate & Manager | amount |
| 6 | Cloud Backup and Recovery | amount |
| 7 | Host Security Service | amount |
| 8 | Virtual Private Cloud | amount |
| 9 | Object Storage Service | amount |
| 10 | Cloud Eye | amount |
| 11 | Cloud Trace Service | amount |
| 12 | Image Management Service | amount |
| 13 | *(blank)* | `=SUM(B2:B12)` — formula, not hardcoded (see §"Requirements for every output" in xlsx conventions) |

**Key design decision — currency conversion happens in code, not in the Gemini prompt.** The source PDF reports USD; the target sheet stores PHP. The bill states its own exchange rate (`1 USD = 60.9780001681 PHP` in this sample) and a USD total that must reconcile with the stated PHP total (`$473.17 USD = ₱28,852.96`). So: ask Gemini to extract USD figures and the exchange rate as given in the document, then multiply in JS. Never ask the model to do the currency math itself — that's exactly the kind of arithmetic step generative extraction can get subtly wrong, and it's trivial to compute deterministically once you have the raw numbers.

**Extraction schema:**

```js
// templates/huawei-cloud.js
module.exports = {
  file: 'templates/huawei-cloud-template.xlsx',
  schema: {
    billingMonth: 'string, first day of billing month as YYYY-MM-01',
    accountName: 'string',
    billingCycle: 'string, e.g. "Jul 01, 2026~Jul 31, 2026"',
    exportTime: 'string, e.g. "Aug 05, 2026 09:18:33 GMT+08:00"',
    invoiceNo: 'string',
    exchangeRateUsdToPhp: 'number',
    totalUsd: 'number',
    // Sum every line item under each category, from the "HUAWEI CLOUD Expenditure
    // Summary" section. Use 0 for any category not present in this bill — the list
    // below is fixed and always has exactly these 11 keys.
    resourcesUsd: {
      'Elastic Cloud Server': 'number',
      'Elastic Volume Service': 'number',
      'Web Application Firewall': 'number',
      'Cloud Certificate & Manager': 'number',
      'Cloud Backup and Recovery': 'number',
      'Host Security Service': 'number',
      'Virtual Private Cloud': 'number',
      'Object Storage Service': 'number',
      'Cloud Eye': 'number',
      'Cloud Trace Service': 'number',
      'Image Management Service': 'number'
    }
  },
  cellMap: {
    summary: {
      billingMonth: 'A5',
      accountName: 'B6',
      remainingAmountPhp: 'D6',   // computed: totalUsd * exchangeRateUsdToPhp
      billingCycle: 'B7',
      billAmountPhp: 'D7',        // same computed value as remainingAmountPhp
      exportTime: 'B8',
      invoiceNo: 'D8',
      totalPhp: 'A13'             // same computed value again
    },
    resources: {
      startRow: 2,
      totalRow: 13,               // written as formula =SUM(B2:B12), not a value
      order: [
        'Elastic Cloud Server', 'Elastic Volume Service', 'Web Application Firewall',
        'Cloud Certificate & Manager', 'Cloud Backup and Recovery', 'Host Security Service',
        'Virtual Private Cloud', 'Object Storage Service', 'Cloud Eye',
        'Cloud Trace Service', 'Image Management Service'
      ]
    }
  }
};
```

**Writer logic specific to this template:**

```js
const phpAmount = extracted.totalUsd * extracted.exchangeRateUsdToPhp;

const summarySheet = workbook.getWorksheet('Summary');
summarySheet.getCell('A5').value = new Date(extracted.billingMonth);
summarySheet.getCell('B6').value = extracted.accountName;
summarySheet.getCell('D6').value = phpAmount;
summarySheet.getCell('B7').value = extracted.billingCycle;
summarySheet.getCell('D7').value = phpAmount;
summarySheet.getCell('B8').value = extracted.exportTime;
summarySheet.getCell('D8').value = extracted.invoiceNo;
summarySheet.getCell('A13').value = phpAmount;

const resourcesSheet = workbook.getWorksheet('Resources');
config.cellMap.resources.order.forEach((category, i) => {
  const row = config.cellMap.resources.startRow + i;
  const usd = extracted.resourcesUsd[category] || 0;
  resourcesSheet.getCell(`B${row}`).value = usd * extracted.exchangeRateUsdToPhp;
});
resourcesSheet.getCell(`B${config.cellMap.resources.totalRow}`).value = '=SUM(B2:B12)';
```

**Sanity check for this template** (run before writing, fail the job rather than silently write bad data):
- `sum(resourcesUsd values)` should be within a small tolerance of `totalUsd` (the PDF's own expenditure summary should reconcile with its category breakdown)
- `totalUsd * exchangeRateUsdToPhp` should be within rounding tolerance of the PHP figure printed in the PDF itself (`"Remaining Amount Due: $X USD = Y PHP"`) — this is a free correctness check since the source document states both values

---

## 6. API endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/convert` | Accepts PDF upload + `templateId`, returns `{ jobId }` |
| `GET` | `/api/jobs/:id` | Returns `{ status, resultUrl?, errorMessage? }` |
| `GET` | `/api/templates` | Lists available templates (for a dropdown in the UI) |

---

## 7. Environment variables

```
AIVEN_MYSQL_URL=
AIVEN_VALKEY_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GEMINI_API_KEY=
```

Set these in Render's dashboard and locally in `.env` (never commit `.env`).

---

## 8. Build roadmap

**Phase 1 — skeleton (get something round-tripping)**
- Set up Render service (Express) + Vercel React app, connected
- Aiven MySQL + Valkey provisioned, connection strings wired in
- `POST /api/convert` that just stores the file in Cloudinary and writes a `pending` row — no extraction yet
- Confirm the whole upload → store → status-poll loop works end to end with a stub "done" after a few seconds

**Phase 2 — real extraction**
- Implement the Huawei Cloud Bill template (§5b) — schema, cell map, and currency-conversion logic already specified
- Wire up Gemini extraction + ExcelJS writer in the worker, using this template as the first end-to-end test case
- Run the reconciliation sanity checks from §5b (category sum vs. stated total, PHP conversion vs. stated PHP) against several real monthly bills before trusting it unattended
- Once this template is solid, use it as the pattern for the next template rather than starting from scratch each time

**Phase 3 — hardening**
- Add the sanity-check step (totals reconcile, required fields present)
- Handle Gemini/Cloudinary/DB errors gracefully — set `status: failed` with a readable `error_message`, surface it in the UI
- Add basic auth if this will be reachable outside your local network (see note below)

**Phase 4 — polish**
- Support multiple templates via the `templateId` dropdown
- Add a simple history view (list past jobs from the `jobs` table)

**Skip for now, revisit only if needed:**
- User accounts/roles — at 1–3 known users, a shared password or IP allowlist on the Render service is enough
- Retry/backoff queue logic — at this volume, a failed job can just be manually re-run
- Autoscaling — irrelevant at this scale

---

## 9. Known limits to plan around

- **Render free tier** spins down after 15 minutes idle; first request after that takes 30–60s to wake up. Fine for occasional internal use — just don't be surprised by it.
- **Aiven free-tier services** can also idle down after inactivity; the worker should reconnect on failure rather than assume a persistent connection.
- **Gemini free tier** is Flash/Flash-Lite only (not Pro) — already the right tier for this task, not a downside, but don't try to switch to Pro expecting it to still be free.
- **Cloudinary free tier** is 25 credits/month shared across storage + bandwidth + transformations, with a 3-user cap — matches your team size exactly, plenty of headroom at this volume.

---

