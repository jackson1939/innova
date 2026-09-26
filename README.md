# Innova — Plataforma de Extracción y Verificación con IA

**Monorepo Turborepo con dos servicios impulsados por IA: extracción de datos de reciclaje desde WhatsApp (Fundares) y verificación de identidad/edad mediante documentos oficiales, sobre AWS Bedrock, Anthropic Claude y Supabase.**

[🇪🇸 Español](#español) · [🇬🇧 English](#english)

---

<a name="español"></a>

## Español

### Descripción general

**Innova** es un monorepo (npm workspaces + Turborepo) que agrupa dos productos independientes construidos alrededor de IA generativa y modelos de visión:

1. **Fundares** — una plataforma de gestión de reciclaje corporativo. Recolectores envían mensajes de WhatsApp (texto, fotos o notas) reportando materiales recolectados; el sistema los extrae automáticamente con IA (Claude / OCR), los deja pendientes de validación humana y genera dashboards, métricas de impacto ambiental y reportes en PDF para las empresas clientes.
2. **Identification** — un microservicio serverless (AWS Lambda) que verifica la edad y autenticidad de documentos de identidad (cédula, pasaporte, licencia) analizando la foto con un modelo de IA en AWS Bedrock, pensado para flujos de verificación de edad en apps móviles o web.

Ambos servicios comparten el mismo patrón: **subida directa a almacenamiento (S3/Supabase Storage) → análisis con un modelo de lenguaje multimodal → resultado estructurado con nivel de confianza**, evitando pasar archivos pesados por el backend de aplicación.

El repositorio contiene además la infraestructura como código (AWS CDK) que despliega el servicio de identificación, y el esquema completo de base de datos (PostgreSQL/Supabase) para Fundares.

> **Nota sobre el estado del código:** este repositorio es un monorepo de trabajo con dos generaciones de la app web de Fundares (`apps/web`, más completa, con paneles de admin/empresa; y `apps/fundares`, una iteración más temprana centrada en el webhook de WhatsApp) y documentación heredada que referencia componentes (p. ej. una app móvil Flutter, workflows de CI/CD) que **no están presentes** en este snapshot del código. Este README documenta únicamente lo que existe realmente en el repositorio.

### Características principales

**Fundares (`apps/fundares` y `apps/web`)**
- Recepción de mensajes de WhatsApp vía webhook de Twilio (`POST /api/webhook/whatsapp`), con respuesta inmediata en TwiML y procesamiento asíncrono en segundo plano.
- Extracción automática de datos de reciclaje (empresa, tipo de material, cantidad en kg, fecha, notas, nivel de confianza) usando la API de Anthropic Claude (`claude-sonnet-4-5`) a partir del texto del mensaje y, opcionalmente, texto extraído por OCR de fotos adjuntas (Google Cloud Vision).
- Flujo de validación humana: las extracciones quedan en estado `pendiente` y un administrador puede `aprobar`, `rechazar` o `corregir` los datos antes de que se conviertan en una "recolección" oficial.
- Dashboards separados por rol (`admin` y `empresa`) con Row Level Security (RLS) en Supabase/Postgres, de forma que cada empresa solo ve sus propios datos.
- Cálculo de métricas de impacto ambiental por empresa y por año (kg reciclados por mes, desglose por tipo de material, comparación interanual).
- Generación de reportes en PDF en el cliente con `@react-pdf/renderer`.
- Contenido educativo sobre reciclaje (artículos, videos, infografías) publicable por administradores.
- Generación de tips personalizados de reciclaje por empresa usando IA, en base a su historial de recolecciones.
- Autenticación y autorización mediante Supabase Auth + middleware de Next.js que redirige según sesión y rol.

**Identification (`apps/identification`)**
- API REST serverless sobre AWS Lambda (framework [Hono](https://hono.dev)), compilada con esbuild para arranque en frío mínimo.
- Flujo de dos pasos: `POST /presign` (URL prefirmada de S3) → subida directa del cliente a S3 → `POST /verify` (análisis y borrado inmediato de la imagen).
- Verificación de edad y autenticidad de documentos de identidad mediante Claude Sonnet 4.5 (perfil de inferencia cross-region de AWS Bedrock).
- Extracción estructurada: nombre completo, fecha de nacimiento, número de documento, si es mayor de edad, si el documento parece auténtico, calidad de imagen y confianza (0–1).
- Códigos de rechazo explícitos: `not_identity_document`, `underage`, `document_not_authentic`, `low_confidence`, `poor_image_quality`.
- Guardrails contra inyección de prompts y jailbreaks embebidos en la imagen del documento.
- Adaptadores intercambiables de modelos Bedrock (`bedrock-adapter.interface.ts`, adaptadores para Claude y para Amazon Nova), lo que permite cambiar de proveedor de IA sin tocar la lógica de negocio.
- Suite de pruebas con Jest y script de prueba local (`scripts/test-local.ts`).
- Soporte para ejecutarse tanto como Lambda (`build:lambda`) como en modo servidor/contenedor ECS (`build:ecs`, Docker Compose incluido).

**Infraestructura (`infra/`)**
- AWS CDK v2 (TypeScript) con stacks separados: recursos compartidos por región y stack principal (API Gateway HTTP v2 + Lambda + S3 + IAM + Secrets Manager + CloudWatch Logs).
- Aspectos de validación personalizados ejecutados en cada `cdk synth`/`cdk deploy`: `SecurityValidationAspect` (detecta cifrado RDS faltante, security groups permisivos, IAM con wildcards) y `CostOptimizationAspect` (detecta configuraciones costosas en entornos de desarrollo).
- Bucket S3 con acceso privado, SSL forzado y regla de expiración automática de objetos temporales (2 días).

### Stack tecnológico

| Categoría | Tecnología |
|---|---|
| Monorepo | npm workspaces + [Turborepo](https://turborepo.dev) 2.9, TypeScript 5.9, Prettier 3.7 |
| Web (`apps/web`) | Next.js 14.2 (App Router), React 18.3, Tailwind CSS 3.4, Recharts, `@react-pdf/renderer`, Supabase (`@supabase/ssr`), Anthropic SDK |
| Web (`apps/fundares`) | Next.js 14.2, React 18.3, TanStack React Query 5.80, Zod, Twilio SDK, `date-fns`, Supabase |
| Base de datos | PostgreSQL vía Supabase — Row Level Security, Realtime (tablas `recolecciones` y `extracciones`) |
| IA — Fundares | Anthropic Claude (`claude-sonnet-4-5`), Google Cloud Vision (OCR) |
| Identification API | Node.js 22, [Hono](https://hono.dev) 4.6, esbuild, AWS Bedrock (Claude Sonnet 4.5 vía perfil de inferencia cross-region, adaptador para Amazon Nova) |
| Infraestructura | AWS CDK v2, API Gateway HTTP v2, AWS Lambda, S3, Secrets Manager, CloudWatch, IAM |
| Testing | Jest + ts-jest (Identification), Jest (infra CDK) |
| Calidad de código | ESLint, Prettier, TypeScript strict, EditorConfig |

### Arquitectura y estructura de carpetas

```
innova/
├── apps/
│   ├── web/            # App Next.js de Fundares (versión completa: paneles admin/empresa)
│   ├── fundares/        # App Next.js de Fundares (iteración anterior, foco en webhook WhatsApp)
│   └── identification/  # API REST serverless (Lambda) de verificación de identidad
├── infra/                # Infraestructura AWS CDK (TypeScript) del servicio de identificación
├── packages/
│   └── shared-types/     # Paquete reservado para tipos TypeScript compartidos (aún sin contenido)
├── supabase/
│   └── schema.sql        # Esquema completo de la base de datos de Fundares (tablas, RLS, Realtime)
├── docs/                 # Documentación técnica adicional (arquitectura, integración, costos)
├── turbo.json            # Configuración de pipelines de Turborepo
└── package.json          # Workspace raíz (scripts globales: build, dev, lint, format)
```

Detalle por carpeta:

- **`apps/web`**: la versión más completa de Fundares. Incluye rutas protegidas `/admin/*` (dashboard, gestión de empresas, validación de extracciones, reportes) y `/empresa/*` (dashboard propio, contenido educativo, reportes), componentes de UI reutilizables (`components/ui`), gráficos separados por tipo (`BarChart`, `LineChart`, `PieChart`) y generación de PDF (`lib/pdf.ts`).
- **`apps/fundares`**: corre en el puerto 3001, expone el webhook de Twilio WhatsApp, la lógica de extracción con Claude (`lib/claude.ts`) y OCR (`lib/ocr.ts`), y usa TanStack Query para el estado del cliente.
- **`apps/identification`**: servicio Lambda con arquitectura por capas (`common/adapters`, `common/services`, `common/exceptions`, `config`, `modules/identification`). El módulo `identification` contiene el controlador, DTOs, servicio de negocio y cálculo de "pricing" (costo por verificación).
- **`infra`**: define `base-stack.ts` (API Gateway + Lambda + S3 + IAM + Secrets Manager + CloudWatch) y `shared-resources-stack.ts` (recursos compartidos por región), más `validation-aspects.ts` con reglas de seguridad y costo aplicadas automáticamente.
- **`supabase/schema.sql`**: define las tablas `empresas`, `perfiles`, `mensajes_recolector`, `extracciones`, `recolecciones` y `contenido_educativo`, con políticas RLS por rol (`admin` / `empresa`) y publicación Realtime.
- **`docs/`**: documentación en inglés y español sobre arquitectura backend/mobile, integración con el cliente, integración frontend y costos de Bedrock; incluye también prototipos de diseño (HTML/JSX) de una función de verificación de edad para una futura app móvil.

### Requisitos previos

- **Node.js ≥ 18** (recomendado 22.x, versión usada en producción por Lambda).
- **npm ≥ 11** (el repo fija `packageManager: npm@11.6.1`).
- Cuenta de **AWS** con acceso a Bedrock (modelos Claude / Amazon Nova habilitados) para `apps/identification` e `infra`.
- Cuenta de **Supabase** (proyecto Postgres + Auth + Storage) para `apps/web` / `apps/fundares`.
- **API key de Anthropic** (`ANTHROPIC_API_KEY`) para la extracción de datos en Fundares.
- Cuenta de **Twilio** con WhatsApp Sandbox/Business API habilitado (para `apps/fundares`).
- **AWS CLI v2** y **AWS CDK v2** (`npm i -g aws-cdk`) para desplegar `infra`.
- Docker (opcional) para levantar Postgres localmente vía `apps/identification/docker-compose.yml`.

### Instalación y configuración

Clonar el repositorio e instalar dependencias de todos los workspaces:

```bash
git clone https://github.com/jackson1939/innova.git
cd innova
npm install
```

**Fundares — apps/web:**

```bash
cp apps/web/.env.local.example apps/web/.env.local  # si no existe, crear con las variables de la sección siguiente
npm run dev:web
# App disponible en http://localhost:3000
```

**Fundares — apps/fundares:**

```bash
cp apps/fundares/.env.local.example apps/fundares/.env.local
npm --prefix apps/fundares run dev
# App disponible en http://localhost:3001
```

Antes de iniciar cualquiera de las dos apps web, aplicar el esquema de base de datos en tu proyecto de Supabase:

```bash
# Desde el SQL editor de Supabase, o con la CLI de Supabase:
supabase db execute --file supabase/schema.sql
```

**Identification API:**

```bash
cd apps/identification
cp .env.example .env
npm install
npm run dev            # servidor local (ts-node + nodemon), recarga en caliente
```

Para levantar Postgres local con Docker (usado por el servicio en modo standalone):

```bash
cd apps/identification
docker compose up -d
```

**Infraestructura (AWS CDK):**

```bash
cd infra
npm install
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1   # una sola vez por cuenta/región

aws secretsmanager create-secret \
  --name fundares/prod/app \
  --secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"info"}'

npx cdk deploy FundaresSharedStack
npx cdk deploy FundaresStack-Prod -c environment=prod
```

### Uso

Comandos disponibles desde la raíz del monorepo (via Turborepo):

```bash
npm run build              # build de todos los workspaces
npm run dev                # modo desarrollo de todos los workspaces en paralelo
npm run dev:web             # solo apps/web (puerto 3000)
npm run dev:identification  # solo apps/identification
npm run lint                # lint de todos los workspaces
npm run format               # Prettier sobre todo el repo (ts, tsx, md)
npm run check-types          # chequeo de tipos TypeScript
```

Comandos específicos de `apps/identification`:

```bash
npm run build          # build de desarrollo (con source maps)
npm run build:prod      # build de producción (minificado)
npm run build:lambda    # build orientado a AWS Lambda
npm run build:ecs       # build orientado a contenedor ECS
npm test                # suite de pruebas con Jest
npm run test:coverage   # pruebas con reporte de cobertura
```

Ejemplo de request a la API de identificación (una vez desplegada o corriendo localmente):

```bash
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/api/v1/identification/presign \
  -H "Content-Type: application/json" \
  -d '{"mimeType": "image/jpeg"}'
```

Referencia completa de los endpoints de ambos servicios (`identification` y `fundares extraction`) disponible en [`infra/README.md`](infra/README.md) y [`apps/identification/README.md`](apps/identification/README.md).

### Variables de entorno

**`apps/fundares/.env.local`** (ver [`apps/fundares/.env.local.example`](apps/fundares/.env.local.example)):

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase (server-side, nunca exponer al cliente) |
| `ANTHROPIC_API_KEY` | API key de Anthropic Claude para extracción de datos |
| `GOOGLE_VISION_API_KEY` | API key de Google Cloud Vision para OCR de imágenes |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Credenciales de Twilio para el webhook de WhatsApp |
| `TWILIO_WHATSAPP_NUMBER` | Número de WhatsApp de Twilio (formato `whatsapp:+1...`) |
| `WEBHOOK_SECRET` | Secreto para validar la autenticidad del webhook |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (usada en generación de PDF y enlaces) |

**`apps/identification/.env`** (ver [`apps/identification/.env.example`](apps/identification/.env.example)):

| Variable | Descripción |
|---|---|
| `NODE_ENV` | `development` \| `staging` \| `production` |
| `DEBUG` | Activa logs de depuración |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciales del contenedor Postgres local (`docker-compose.yml`) |
| `BEDROCK_MODEL_ID` | ID del modelo/perfil de inferencia de Bedrock a usar |
| `S3_VERIFICATION_BUCKET` | Bucket S3 para staging temporal de imágenes |
| `CONFIDENCE_THRESHOLD` | Umbral mínimo de confianza para aprobar (0–1, por defecto `0.85`) |

En producción, los secretos se gestionan vía **AWS Secrets Manager** (`fundares/prod/app`), inyectados por CDK — no se versionan en el repositorio.

### Estado del proyecto / roadmap

- Proyecto en **desarrollo activo**, con dos servicios funcionales de extremo a extremo (Fundares e Identification) y su infraestructura de despliegue.
- `apps/web` es la iteración más reciente/completa de Fundares (paneles admin/empresa diferenciados); `apps/fundares` es una iteración previa centrada en el webhook de WhatsApp — conviven en el repo, sin que quede documentado formalmente cuál reemplaza a cuál.
- El paquete `packages/shared-types` está declarado en el workspace pero aún no contiene tipos compartidos.
- La documentación en `docs/` incluye prototipos de diseño (HTML/JSX) para una futura app móvil de verificación de edad; no hay código de app móvil (Flutter u otro) en este repositorio todavía.
- No hay workflows de CI/CD (`.github/workflows`) en el snapshot actual, aunque `CONTRIBUTING.md` y el `CHANGELOG.md` describen un pipeline de CI/CD y una app móvil Flutter que corresponden a un estado o repositorio anterior del proyecto.

### Licencia

Este proyecto está licenciado bajo la **Licencia MIT** — ver el archivo [`LICENSE`](LICENSE).

### Autor / Contacto

- **GitHub:** [jackson1939](https://github.com/jackson1939)
- Repositorio: [github.com/jackson1939/innova](https://github.com/jackson1939/innova)

---

<a name="english"></a>

## English

### Overview

**Innova** is an npm-workspaces + Turborepo monorepo bundling two independent products built around generative AI and vision models:

1. **Fundares** — a corporate recycling management platform. Collectors send WhatsApp messages (text, photos or notes) reporting collected materials; the system automatically extracts the data using AI (Claude / OCR), leaves it pending human validation, and generates dashboards, environmental impact metrics and PDF reports for client companies.
2. **Identification** — a serverless microservice (AWS Lambda) that verifies the age and authenticity of identity documents (ID card, passport, driver's license) by analysing the photo with an AI model on AWS Bedrock, designed for age-verification flows in mobile or web apps.

Both services share the same pattern: **direct upload to storage (S3/Supabase Storage) → analysis with a multimodal language model → structured result with a confidence score**, avoiding routing large media files through the application backend.

The repository also contains the infrastructure as code (AWS CDK) that deploys the identification service, and the full database schema (PostgreSQL/Supabase) for Fundares.

> **Note on code state:** this is a working monorepo with two generations of the Fundares web app (`apps/web`, the more complete one with admin/company dashboards; and `apps/fundares`, an earlier iteration centered on the WhatsApp webhook) and legacy documentation that references components (e.g. a Flutter mobile app, CI/CD workflows) that are **not present** in this code snapshot. This README documents only what actually exists in the repository.

### Key features

**Fundares (`apps/fundares` and `apps/web`)**
- Receives WhatsApp messages via a Twilio webhook (`POST /api/webhook/whatsapp`), replying immediately with TwiML and processing asynchronously in the background.
- Automatic extraction of recycling data (company, material type, quantity in kg, date, notes, confidence score) using the Anthropic Claude API (`claude-sonnet-4-5`) from the message text and, optionally, OCR text extracted from attached photos (Google Cloud Vision).
- Human validation workflow: extractions stay in a `pendiente` (pending) state and an admin can `aprobar` (approve), `rechazar` (reject) or `corregir` (correct) the data before it becomes an official collection record.
- Role-based dashboards (`admin` and `empresa`) with Row Level Security (RLS) in Supabase/Postgres, so each company only sees its own data.
- Environmental impact metrics per company and per year (kg recycled per month, breakdown by material type, year-over-year comparison).
- Client-side PDF report generation with `@react-pdf/renderer`.
- Publishable educational content about recycling (articles, videos, infographics).
- AI-generated personalized recycling tips per company, based on collection history.
- Authentication and authorization via Supabase Auth plus a Next.js middleware that redirects based on session and role.

**Identification (`apps/identification`)**
- Serverless REST API on AWS Lambda (using the [Hono](https://hono.dev) framework), bundled with esbuild for minimal cold starts.
- Two-step flow: `POST /presign` (presigned S3 URL) → client uploads directly to S3 → `POST /verify` (analysis and immediate deletion of the image).
- Age and document-authenticity verification via Claude Sonnet 4.5 (AWS Bedrock cross-region inference profile).
- Structured extraction: full name, date of birth, document number, whether the person is an adult, whether the document appears authentic, image quality and confidence (0–1).
- Explicit rejection codes: `not_identity_document`, `underage`, `document_not_authentic`, `low_confidence`, `poor_image_quality`.
- Guardrails against prompt injection and jailbreak attempts embedded in the document image.
- Swappable Bedrock model adapters (`bedrock-adapter.interface.ts`, adapters for Claude and Amazon Nova), allowing the AI provider to be changed without touching business logic.
- Jest test suite plus a local test script (`scripts/test-local.ts`).
- Can run both as a Lambda (`build:lambda`) and as a server/ECS container (`build:ecs`, Docker Compose included).

**Infrastructure (`infra/`)**
- AWS CDK v2 (TypeScript) with separate stacks: region-wide shared resources and the main stack (HTTP API Gateway v2 + Lambda + S3 + IAM + Secrets Manager + CloudWatch Logs).
- Custom validation aspects run on every `cdk synth`/`cdk deploy`: `SecurityValidationAspect` (flags missing RDS encryption, permissive security groups, wildcard IAM) and `CostOptimizationAspect` (flags costly configurations in dev environments).
- Private S3 bucket with enforced SSL and an automatic lifecycle rule expiring temporary objects after 2 days.

### Tech stack

| Category | Technology |
|---|---|
| Monorepo | npm workspaces + [Turborepo](https://turborepo.dev) 2.9, TypeScript 5.9, Prettier 3.7 |
| Web (`apps/web`) | Next.js 14.2 (App Router), React 18.3, Tailwind CSS 3.4, Recharts, `@react-pdf/renderer`, Supabase (`@supabase/ssr`), Anthropic SDK |
| Web (`apps/fundares`) | Next.js 14.2, React 18.3, TanStack React Query 5.80, Zod, Twilio SDK, `date-fns`, Supabase |
| Database | PostgreSQL via Supabase — Row Level Security, Realtime (`recolecciones` and `extracciones` tables) |
| AI — Fundares | Anthropic Claude (`claude-sonnet-4-5`), Google Cloud Vision (OCR) |
| Identification API | Node.js 22, [Hono](https://hono.dev) 4.6, esbuild, AWS Bedrock (Claude Sonnet 4.5 via cross-region inference profile, Amazon Nova adapter) |
| Infrastructure | AWS CDK v2, HTTP API Gateway v2, AWS Lambda, S3, Secrets Manager, CloudWatch, IAM |
| Testing | Jest + ts-jest (Identification), Jest (CDK infra) |
| Code quality | ESLint, Prettier, strict TypeScript, EditorConfig |

### Architecture and folder structure

```
innova/
├── apps/
│   ├── web/            # Fundares Next.js app (full version: admin/company dashboards)
│   ├── fundares/        # Fundares Next.js app (earlier iteration, WhatsApp webhook focused)
│   └── identification/  # Serverless (Lambda) identity-verification REST API
├── infra/                # AWS CDK infrastructure (TypeScript) for the identification service
├── packages/
│   └── shared-types/     # Reserved package for shared TypeScript types (no content yet)
├── supabase/
│   └── schema.sql        # Full Fundares database schema (tables, RLS, Realtime)
├── docs/                 # Additional technical documentation (architecture, integration, costs)
├── turbo.json            # Turborepo pipeline configuration
└── package.json          # Root workspace (global scripts: build, dev, lint, format)
```

Per-folder detail:

- **`apps/web`**: the most complete version of Fundares. Includes protected `/admin/*` routes (dashboard, company management, extraction validation, reports) and `/empresa/*` routes (own dashboard, educational content, reports), reusable UI components (`components/ui`), per-type charts (`BarChart`, `LineChart`, `PieChart`) and PDF generation (`lib/pdf.ts`).
- **`apps/fundares`**: runs on port 3001, exposes the Twilio WhatsApp webhook, the Claude-based extraction logic (`lib/claude.ts`) and OCR (`lib/ocr.ts`), and uses TanStack Query for client state.
- **`apps/identification`**: a layered Lambda service (`common/adapters`, `common/services`, `common/exceptions`, `config`, `modules/identification`). The `identification` module holds the controller, DTOs, business service and per-verification pricing calculation.
- **`infra`**: defines `base-stack.ts` (API Gateway + Lambda + S3 + IAM + Secrets Manager + CloudWatch) and `shared-resources-stack.ts` (region-wide shared resources), plus `validation-aspects.ts` with automatically-applied security and cost rules.
- **`supabase/schema.sql`**: defines the `empresas`, `perfiles`, `mensajes_recolector`, `extracciones`, `recolecciones` and `contenido_educativo` tables, with role-based RLS policies (`admin` / `empresa`) and Realtime publication.
- **`docs/`**: English and Spanish documentation on backend/mobile architecture, client integration, frontend integration and Bedrock costs; it also includes design prototypes (HTML/JSX) for a future age-verification mobile app.

### Prerequisites

- **Node.js ≥ 18** (22.x recommended — the version Lambda runs in production).
- **npm ≥ 11** (the repo pins `packageManager: npm@11.6.1`).
- An **AWS** account with Bedrock access (Claude / Amazon Nova models enabled) for `apps/identification` and `infra`.
- A **Supabase** project (Postgres + Auth + Storage) for `apps/web` / `apps/fundares`.
- An **Anthropic API key** (`ANTHROPIC_API_KEY`) for Fundares data extraction.
- A **Twilio** account with WhatsApp Sandbox/Business API enabled (for `apps/fundares`).
- **AWS CLI v2** and **AWS CDK v2** (`npm i -g aws-cdk`) to deploy `infra`.
- Docker (optional) to run Postgres locally via `apps/identification/docker-compose.yml`.

### Installation and setup

Clone the repository and install dependencies for all workspaces:

```bash
git clone https://github.com/jackson1939/innova.git
cd innova
npm install
```

**Fundares — apps/web:**

```bash
cp apps/web/.env.local.example apps/web/.env.local  # create it with the variables below if it doesn't exist
npm run dev:web
# App available at http://localhost:3000
```

**Fundares — apps/fundares:**

```bash
cp apps/fundares/.env.local.example apps/fundares/.env.local
npm --prefix apps/fundares run dev
# App available at http://localhost:3001
```

Before starting either web app, apply the database schema to your Supabase project:

```bash
# From the Supabase SQL editor, or with the Supabase CLI:
supabase db execute --file supabase/schema.sql
```

**Identification API:**

```bash
cd apps/identification
cp .env.example .env
npm install
npm run dev            # local server (ts-node + nodemon), hot reload
```

To run Postgres locally with Docker (used by the service in standalone mode):

```bash
cd apps/identification
docker compose up -d
```

**Infrastructure (AWS CDK):**

```bash
cd infra
npm install
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1   # once per account/region

aws secretsmanager create-secret \
  --name fundares/prod/app \
  --secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"info"}'

npx cdk deploy FundaresSharedStack
npx cdk deploy FundaresStack-Prod -c environment=prod
```

### Usage

Commands available from the monorepo root (via Turborepo):

```bash
npm run build              # build all workspaces
npm run dev                # run all workspaces in dev mode, in parallel
npm run dev:web             # apps/web only (port 3000)
npm run dev:identification  # apps/identification only
npm run lint                # lint all workspaces
npm run format               # Prettier over the whole repo (ts, tsx, md)
npm run check-types          # TypeScript type checking
```

`apps/identification`-specific commands:

```bash
npm run build          # development build (with source maps)
npm run build:prod      # production build (minified)
npm run build:lambda    # Lambda-targeted build
npm run build:ecs       # ECS container-targeted build
npm test                # run the Jest test suite
npm run test:coverage   # run tests with coverage report
```

Example request to the identification API (once deployed or running locally):

```bash
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/api/v1/identification/presign \
  -H "Content-Type: application/json" \
  -d '{"mimeType": "image/jpeg"}'
```

Full endpoint reference for both services (identification and Fundares extraction) is available in [`infra/README.md`](infra/README.md) and [`apps/identification/README.md`](apps/identification/README.md).

### Environment variables

**`apps/fundares/.env.local`** (see [`apps/fundares/.env.local.example`](apps/fundares/.env.local.example)):

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side only, never expose to the client) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key for data extraction |
| `GOOGLE_VISION_API_KEY` | Google Cloud Vision API key for image OCR |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio credentials for the WhatsApp webhook |
| `TWILIO_WHATSAPP_NUMBER` | Twilio WhatsApp number (`whatsapp:+1...` format) |
| `WEBHOOK_SECRET` | Secret used to validate webhook authenticity |
| `NEXT_PUBLIC_APP_URL` | Public app URL (used for PDF generation and links) |

**`apps/identification/.env`** (see [`apps/identification/.env.example`](apps/identification/.env.example)):

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` \| `staging` \| `production` |
| `DEBUG` | Enables debug logging |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` |
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Local Postgres container credentials (`docker-compose.yml`) |
| `BEDROCK_MODEL_ID` | Bedrock model/inference-profile ID to use |
| `S3_VERIFICATION_BUCKET` | S3 bucket for temporary image staging |
| `CONFIDENCE_THRESHOLD` | Minimum confidence required to approve (0–1, default `0.85`) |

In production, secrets are managed via **AWS Secrets Manager** (`fundares/prod/app`), injected by CDK — they are not committed to the repository.

### Project status / roadmap

- The project is under **active development**, with two functional end-to-end services (Fundares and Identification) and their deployment infrastructure.
- `apps/web` is the newer/more complete Fundares iteration (separate admin/company dashboards); `apps/fundares` is an earlier iteration focused on the WhatsApp webhook — both currently coexist in the repo, with no formal documentation on which supersedes the other.
- The `packages/shared-types` package is declared in the workspace but does not yet contain any shared types.
- The `docs/` folder includes design prototypes (HTML/JSX) for a future age-verification mobile app; there is no mobile app code (Flutter or otherwise) in this repository yet.
- There are no CI/CD workflows (`.github/workflows`) in the current snapshot, even though `CONTRIBUTING.md` and `CHANGELOG.md` describe a CI/CD pipeline and a Flutter mobile app that correspond to an earlier state or repository of the project.

### License

This project is licensed under the **MIT License** — see the [`LICENSE`](LICENSE) file.

### Author / Contact

- **GitHub:** [jackson1939](https://github.com/jackson1939)
- Repository: [github.com/jackson1939/innova](https://github.com/jackson1939/innova)
