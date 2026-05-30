# Fundares — Infrastructure (CDK)

AWS CDK infrastructure for the Fundares AI Extraction Service. Deployed to `us-east-1`.

---

## Stacks

| Stack | Description |
|---|---|
| `FundaresSharedStack` | Shared region-wide resources |
| `FundaresStack-Prod` | Prod — API Gateway, Lambda, S3, IAM |

---

## Resources

### Lambda — `fundares-prod-function`
| Property | Value |
|---|---|
| Runtime | Node.js 22.x |
| Memory | 512 MB |
| Timeout | 10 s |
| Handler | `apps/identification/src/index.ts` → `handler` |
| Build | esbuild — minified, no source maps |

**Environment variables:**

| Variable | Source | Value |
|---|---|---|
| `NODE_ENV` | CDK | `production` |
| `CORS_ORIGINS` | Secrets Manager | `fundares/prod/app` |
| `LOG_LEVEL` | Secrets Manager | `fundares/prod/app` |
| `S3_COLLECTIONS_BUCKET` | CDK | bucket name (auto-resolved) |
| `BEDROCK_MODEL_ID` | CDK | `global.amazon.nova-2-lite-v1:0` |
| `BEDROCK_FALLBACK_MODEL_ID` | CDK | `amazon.nova-pro-v1:0` |
| `CONFIDENCE_THRESHOLD` | CDK | `0.75` |

---

### API Gateway — HTTP API (v2)
- Base URL: `https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com`
- Routes: `ANY /` and `ANY /{proxy+}` → Lambda (AWS_PROXY, payload 2.0)
- Stage: `$default` (auto-deploy)
- CORS: all origins, methods, and headers allowed (`*`)
- Access logs → `/aws/api_gw/fundares-prod-api`

#### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/extract/presign` | Request presigned S3 URL for image or video upload |
| `POST` | `/api/v1/extract/media` | Analyse uploaded image or video |
| `POST` | `/api/v1/extract/text` | Extract recycling data from a plain text message |

#### `POST /api/v1/extract/presign`

```json
// Request
{ "mimeType": "image/jpeg" }

// Response 200
{
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "uploadUrl": "https://s3.amazonaws.com/...",
    "expiresIn": 300
  }
}
```

Supported `mimeType`: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/mov`, `video/avi`, `video/mkv`

> The PUT to S3 must include `Content-Type: <mimeType>` or the upload will fail with 403.

#### `POST /api/v1/extract/media`

```json
// Request
{ "sessionId": "550e8400-e29b-41d4-a716-446655440000", "type": "image" }
```

`type`: `image` | `video`

#### `POST /api/v1/extract/text`

```json
// Request
{ "message": "today thursday I collected at Industrias Bisa 35 kg of cardboard" }
```

#### Extraction Result (all three endpoints)

```json
// 200 — high confidence
{
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "inputType": "text",
    "confidence": "high",
    "extracted": {
      "company": "Industrias Bisa",
      "date": "2026-05-30",
      "materials": [
        { "type": "cardboard", "quantity": 35.0, "unit": "kg" },
        { "type": "PET plastic","quantity": 20.0, "unit": "unit" },
        { "type": "glass",     "quantity": null,  "unit": null }
      ],
      "notes": "Glass was not weighed"
    }
  }
}

// 422 — low confidence after Nova Pro retry
{
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "inputType": "image",
    "confidence": "low",
    "extracted": null,
    "rejectedReasons": ["poor_image_quality"]
  }
}
```

**`confidence` values**

| Value | Meaning |
|---|---|
| `high` | Clear, unambiguous input — returned directly |
| `medium` | Partial data or minor ambiguity — returned with warning |
| `low` | Insufficient data — retried once with Nova Pro fallback |

**`rejectedReasons` codes**

| Code | Meaning |
|---|---|
| `poor_image_quality` | Image too blurry or dark to read |
| `poor_video_quality` | Video too short, dark, or out of focus |
| `no_recycling_data` | No recognizable recycling information |
| `ambiguous_company` | Company name not recognizable |
| `low_confidence` | Confidence below threshold after Nova Pro retry |

#### Error responses

```json
{ "error": "<message>", "code": "<CODE>" }
```

| Status | Code | Cause |
|---|---|---|
| `400` | `MISSING_MIME_TYPE` | `mimeType` not provided in presign request |
| `400` | `MISSING_SESSION_ID` | `sessionId` not provided in `/extract/media` |
| `400` | `MISSING_MESSAGE` | `message` not provided in `/extract/text` |
| `400` | `INVALID_TYPE` | `type` not `image` or `video` |
| `404` | `SESSION_NOT_FOUND` | Session expired or media never uploaded |
| `415` | `UNSUPPORTED_MIME_TYPE` | `mimeType` not in supported list |
| `422` | `EXTRACTION_FAILED` | Low confidence after Nova Pro retry |
| `500` | — | Unexpected Lambda or Bedrock error |

---

### S3 — `fundares-prod-collections`
Temporary media staging for image and video inputs.

| Property | Value |
|---|---|
| Access | Private (block all public) |
| SSL | Enforced |
| Lifecycle | `sessions/` prefix expires after 2 days |
| Removal | Destroyed with the stack |

Media is deleted by the Lambda after each Bedrock call. The 2-day lifecycle rule is a safety net for Lambda timeouts.

> Videos cannot be passed to Nova 2 Lite as base64 — they must be uploaded to this bucket and referenced via `s3Location` URI.

---

### Secrets Manager — `fundares/prod/app`
Runtime configuration. **Not managed by CDK** — must be created before first deploy to avoid CloudFormation placeholder resolution issues.

Keys: `CORS_ORIGINS`, `LOG_LEVEL`

Bootstrap (one-time):
```bash
aws secretsmanager create-secret \
  --name fundares/prod/app \
  --secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"info"}'
```

---

### IAM — `fundares-prod-lambda-exec-role`
| Permission | Scope |
|---|---|
| `AWSLambdaBasicExecutionRole` | CloudWatch Logs |
| `secretsmanager:GetSecretValue` | `fundares/prod/app` |
| `s3:GetObject/PutObject/DeleteObject` | Collections bucket |
| `bedrock:InvokeModel` | Models listed below |
| `aws-marketplace:ViewSubscriptions/Subscribe/Unsubscribe` | `*` (required for first-time Bedrock model activation) |

---

### CloudWatch Logs
| Log Group | Retention |
|---|---|
| `/aws/lambda/fundares-prod-function` | 7 days |
| `/aws/api_gw/fundares-prod-api` | 7 days |

---

## Bedrock Models

Active model is set via `BEDROCK_MODEL_ID`. No code or infra change needed to switch.

### Primary — Amazon Nova 2 Lite
| Setting | Value |
|---|---|
| Model ID | `global.amazon.nova-2-lite-v1:0` |
| Invocation API | Converse API |
| Context window | 1M tokens |
| Max output tokens | 1 000 |
| Temperature | 0.1 |
| Extended thinking | Disabled |

### Fallback — Amazon Nova Pro
Triggered automatically when primary returns `confidence: "low"`.

| Setting | Value |
|---|---|
| Model ID | `amazon.nova-pro-v1:0` |
| Trigger | `confidence` below `CONFIDENCE_THRESHOLD` (default `0.75`) |

### Supported input modalities

| Modality | Formats | Delivery |
|---|---|---|
| Text | Plain text | Request body |
| Image | JPEG, PNG, WEBP | Base64 (inline) |
| Video | MP4, MOV, AVI, MKV, WebM | S3 URI (`s3Location`) — max 2 min |

> **Nova 2 Lite does not accept video as base64.** Videos must be uploaded to S3 first and passed as an `s3Location` URI. The Lambda handles this automatically via the presign → upload → extract flow.

### IAM ARNs granted

```
arn:aws:bedrock:*:{account}:inference-profile/us.anthropic.claude-haiku-4*
arn:aws:bedrock:*:{account}:inference-profile/us.anthropic.claude-sonnet-4*
arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4*
arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4*
arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0
arn:aws:bedrock:*::foundation-model/amazon.nova-pro-v1:0
```

---

## Confidence Threshold

`CONFIDENCE_THRESHOLD` (default `0.75`) — when Nova 2 Lite returns `confidence: "low"`, the Lambda retries automatically with Nova Pro. If Nova Pro also returns `low`, the endpoint responds `422` with `EXTRACTION_FAILED`.

---

## Deployment

```bash
# 1. Bootstrap CDK (once per account/region)
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1

# 2. Create the secret (once, before first deploy)
aws secretsmanager create-secret \
  --name fundares/prod/app \
  --secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"info"}'

# 3. Deploy shared stack
npx cdk deploy FundaresSharedStack

# 4. Deploy main stack
npx cdk deploy FundaresStack-Prod -c environment=prod
```

CI/CD handles steps 2–4 automatically on every push to `main`.

---

## Validation Aspects

Applied on every `cdk synth` / `cdk deploy`:

| Aspect | What it checks |
|---|---|
| `SecurityValidationAspect` | Missing RDS encryption, permissive security groups (`0.0.0.0/0`), wildcard IAM (`Allow * on *`) |
| `CostOptimizationAspect` | Large ECS task counts, multi-AZ RDS, NAT Gateways in dev |
