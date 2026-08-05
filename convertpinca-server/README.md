# ConvertPinca Server

Express API + Worker backend for the PDF to Templated Excel Converter.

## Setup

```bash
npm install
```

Configure environment variables by copying `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your credentials. The MariaDB DB (`convertpinca`) should already be created.

## Database (Prisma + Local MariaDB)

```bash
# Push schema to MariaDB (creates tables)
npx prisma db push

# Open Prisma Studio (optional DB UI)
npx prisma studio
```

## Running

### API Server
```bash
npm run dev
```
Server starts at `http://localhost:5000`

### Worker (separate terminal)
```bash
npm run worker
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/convert` | Upload PDF + templateId, returns `{ jobId }` |
| `GET`  | `/api/jobs` | List all recent jobs |
| `GET`  | `/api/jobs/:id` | Get job status and result URL |
| `GET`  | `/api/templates` | List available templates |
| `GET`  | `/health` | Health check |

## Environment Variables

See `.env.example` for all required variables.
