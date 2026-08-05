# Graph Report - ConvertPinca  (2026-08-05)

## Corpus Check
- 56 files · ~14,437 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 349 nodes · 499 edges · 19 communities (16 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- JobHistoryTable.tsx
- index.js
- dependencies
- compilerOptions
- dependencies
- devDependencies
- compilerOptions
- worker.js
- compilerOptions
- scripts
- plugins
- generate-template.js
- vite-env.d.ts
- PDF → Templated Excel Converter — Project Plan
- vercel.json
- ConvertPinca Server
- test-pipeline.js
- React + TypeScript + Vite

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 18 edges
3. `compilerOptions` - 15 edges
4. `react` - 12 edges
5. `processJob()` - 11 edges
6. `PDF → Templated Excel Converter — Project Plan` - 11 edges
7. `Job` - 9 edges
8. `scripts` - 9 edges
9. `cn()` - 8 edges
10. `writeExcel()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `JobStatusTrackerProps` --references--> `Job`  [EXTRACTED]
  convertpinca-client/src/components/JobStatus/JobStatusTracker.tsx → convertpinca-client/src/types/index.ts
- `ResultPreviewProps` --references--> `Job`  [EXTRACTED]
  convertpinca-client/src/components/ResultPreview/ResultPreview.tsx → convertpinca-client/src/types/index.ts
- `UseJobPollingResult` --references--> `Job`  [EXTRACTED]
  convertpinca-client/src/hooks/useJobPolling.ts → convertpinca-client/src/types/index.ts
- `processJob()` --calls--> `writeExcel()`  [EXTRACTED]
  convertpinca-server/worker.js → convertpinca-server/services/excel/writer.js
- `processJob()` --calls--> `normalizeInvoiceData()`  [EXTRACTED]
  convertpinca-server/worker.js → convertpinca-server/services/extraction/normalize.js

## Import Cycles
- None detected.

## Communities (19 total, 3 thin omitted)

### Community 0 - "JobHistoryTable.tsx"
Cohesion: 0.07
Nodes (48): api, ActiveTab, App(), JobHistoryTable(), JobHistoryTableProps, getProgressValue(), getStepIndex(), JobStatusTracker() (+40 more)

### Community 1 - "index.js"
Cohesion: 0.18
Nodes (8): app, __dirname, errorHandler(), router, router, router, listTemplates(), templates

### Community 2 - "dependencies"
Cohesion: 0.07
Nodes (27): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, lucide-react, @radix-ui/react-alert-dialog, @radix-ui/react-dialog (+19 more)

### Community 3 - "compilerOptions"
Cohesion: 0.08
Nodes (25): compilerOptions, allowImportingTsExtensions, baseUrl, ignoreDeprecations, isolatedModules, jsx, lib, module (+17 more)

### Community 4 - "dependencies"
Cohesion: 0.08
Nodes (25): cloudinary, dependencies, cloudinary, cors, dotenv, exceljs, express, @google/genai (+17 more)

### Community 5 - "devDependencies"
Cohesion: 0.08
Nodes (24): devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+16 more)

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 7 - "worker.js"
Cohesion: 0.09
Nodes (25): isCloudinaryConfigured, getGeminiClient(), config, getQueueClient(), inMemoryQueue, localQueue, storage, upload (+17 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 9 - "scripts"
Cohesion: 0.11
Nodes (17): description, devDependencies, nodemon, main, name, scripts, build, dev (+9 more)

### Community 10 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 13 - "PDF → Templated Excel Converter — Project Plan"
Cohesion: 0.17
Nodes (11): 1. Goal, 2. Final stack, 3. Architecture / data flow, 4. Database schema, 5. Extraction: Gemini prompt → JSON → Excel, 5b. Template 1: Huawei Cloud Bill (concrete example), 6. API endpoints, 7. Environment variables (+3 more)

### Community 15 - "ConvertPinca Server"
Cohesion: 0.22
Nodes (8): API Endpoints, API Server, ConvertPinca Server, Database (Prisma + Local MariaDB), Environment Variables, Running, Setup, Worker (separate terminal)

### Community 16 - "test-pipeline.js"
Cohesion: 0.23
Nodes (9): __dirname, __filename, runPipelineTests(), renderServiceRows(), copyCellStyle(), writeExcel(), normalizeInvoiceData(), reconcile() (+1 more)

### Community 17 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **157 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+152 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `react` connect `JobHistoryTable.tsx` to `plugins`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _157 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `JobHistoryTable.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07111501316944688 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._