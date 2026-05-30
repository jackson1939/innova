# Fundares — AI Extraction Service

Monorepo for the Fundares recycling data extraction platform. A serverless Lambda backed by **Amazon Nova 2 Lite** (Bedrock) extracts structured recycling collection data from WhatsApp messages — plain text, photos, and videos sent by collectors.

---

## Repository structure

```
fundares/
├── apps/
│   └── identification/   # Node.js 22 Lambda — REST API + Bedrock AI extraction
├── infra/                # AWS CDK (TypeScript) — all cloud resources
└── package.json          # Root workspace (npm workspaces)
```

---

## How it works

```
Client (WhatsApp / frontend)
  │
  │ option A — text message
  │  POST /api/v1/extract/text  { message }
  │  ← ExtractionResult
  │
  │ option B — image or video
  │  POST /api/v1/extract/presign  { mimeType }
  │  ← { sessionId, uploadUrl }
  │
  │  PUT <uploadUrl>  ──────────────────────────────────► S3 (private bucket)
  │  (direct upload — never through Lambda)
  │
  │  POST /api/v1/extract/media  { sessionId, type }
  │                                                        Lambda
  │                                                          ├─ reads media from S3
  │                                                          ├─ invokes Nova 2 Lite
  │                                                          ├─ retries with Nova Pro on low confidence
  │                                                          └─ deletes media from S3
  │  ← ExtractionResult { confidence, extracted, rejectedReasons }
```

---

## Apps

| App | Language | Description |
|---|---|---|
| `apps/identification` | TypeScript / Node 22 | Lambda REST API — text extraction, presign, S3 upload, Bedrock AI analysis |

## Infrastructure

| Module | Description |
|---|---|
| `infra` | AWS CDK — API Gateway, Lambda, S3, Bedrock IAM, Secrets Manager |

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/extract/text` | Extract recycling data from a plain text message |
| `POST` | `/api/v1/extract/presign` | Get a presigned S3 URL for image or video upload |
| `POST` | `/api/v1/extract/media` | Analyse an uploaded image or video |

Full request/response reference → [`infra/README.md`](infra/README.md)  
Frontend integration examples → [`docs/(en)/project/apps/indentification/frontend-integration.md`](docs/(en)/project/apps/indentification/frontend-integration.md)

---

## Cloud resources (prod)

| Resource | Name |
|---|---|
| Lambda function | `fundares-prod-function` |
| API Gateway (HTTP) | `fundares-prod` |
| S3 bucket | `fundares-prod-collections` |
| Secrets Manager | `fundares/prod/app` |
| CloudWatch (Lambda) | `/aws/lambda/fundares-prod-function` |
| CloudWatch (API GW) | `/aws/api_gw/fundares-prod-api` |
| IAM role | `fundares-prod-lambda-exec-role` |

---

## Deploy

```bash
# 1. Bootstrap CDK (once per account/region)
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1

# 2. Create the secret (once, before first deploy)
aws secretsmanager create-secret \
  --name fundares/prod/app \
  --secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"info"}'

# 3. Deploy
cd infra
npx cdk deploy FundaresStack-Prod -c environment=prod
```

CI/CD deploys automatically on every push to `main`.

---

## Tech stack

| Layer | Technology |
|---|---|
| API | Hono, Node.js 22, TypeScript, esbuild |
| AI (primary) | AWS Bedrock — Amazon Nova 2 Lite (`global.amazon.nova-2-lite-v1:0`) |
| AI (fallback) | AWS Bedrock — Amazon Nova Pro (`amazon.nova-pro-v1:0`) |
| Storage | S3 — presigned PUT, auto-deleted after extraction |
| Infra | AWS CDK v2, API Gateway v2 (HTTP), Lambda, Secrets Manager |
