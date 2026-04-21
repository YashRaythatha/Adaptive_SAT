# Google Cloud Platform (GCP) — Full deployment guide for Adaptive SAT

This document is written for someone **new to GCP** (including first-time setup). It covers:

1. What you are building on GCP  
2. Creating an account and a project  
3. Installing tools on your computer  
4. Database (Cloud SQL for PostgreSQL)  
5. Secrets (Secret Manager)  
6. Backend API (Cloud Run + Docker)  
7. Running database migrations and optional seeding  
8. Frontend (build + Firebase Hosting)  
9. **Copying your local database to the cloud**  
10. Mobile app (Expo) pointing at production  
11. Checklists and troubleshooting  

**Project stack (reminder):** FastAPI backend, PostgreSQL, Vite/React frontend, optional Expo mobile app.

**Your Google Cloud project ID (used in all command examples below):** `SAT1600` — if yours differs, replace `SAT1600` with your actual Project ID everywhere it appears.

---

## Part A — Concepts (read once)

### What is GCP?

**Google Cloud Platform** is Google’s cloud: you rent servers, databases, and services instead of running everything on your laptop.

- **Project** — A container for all your GCP resources (databases, apps, billing). You give it a **Project ID** (unique; this guide uses **`SAT1600`** as the example).
- **Region** — A geographic area where resources run (e.g. `us-central1`). Pick **one region** and use it for Cloud SQL and Cloud Run so latency and billing stay predictable.
- **Billing** — GCP needs a **billing account** (credit card). Many services have a free tier; you should still **set a budget alert** in the console.

### What you will create

| What | GCP service | Role |
|------|-------------|------|
| PostgreSQL database | **Cloud SQL** | Same role as Postgres on your PC |
| API (FastAPI) | **Cloud Run** | Runs your backend in a container |
| Docker image storage | **Artifact Registry** | Stores the built API image |
| API keys / passwords | **Secret Manager** | Safer than pasting secrets in the console |
| Static website (React build) | **Firebase Hosting** (recommended for beginners) or Cloud Storage + Load Balancer | Serves `frontend/dist` |

---

## Part B — First-time GCP setup

### B1. Create a Google account and enable billing

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/) and sign in with a Google account.  
2. Open **Billing** from the menu (or search “Billing”).  
3. **Link a billing account** (credit card).  
4. Optional but recommended: **Budgets & alerts** → create a monthly budget (e.g. $50) so you get email alerts.

### B2. Create a project

1. At the top of the console, click the **project dropdown** → **New project**.  
2. Enter a **name** (e.g. `Adaptive SAT Production`).  
3. Note the **Project ID** (you cannot change it easily). For this deployment, the project ID is **`SAT1600`**.  
4. Select this project in the dropdown so everything you do applies to it.

### B3. Install Google Cloud SDK (`gcloud`) on your computer

1. Open: [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)  
2. Install for **Windows** / **macOS** / **Linux** following the page for your OS.  
3. Open a **new** terminal (PowerShell, Command Prompt, or Terminal) and run:

```bash
gcloud --version
```

You should see a version number.

4. Log in and set your project:

```bash
gcloud auth login
gcloud config set project SAT1600
```

If you use a different project, replace `SAT1600` with your Project ID.

### B4. Enable required APIs

GCP features are turned on per **API**. Enable these once (Console: **APIs & Services** → **Enable APIs and services**, or use Cloud Shell / terminal):

```bash
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

If a command says “already enabled,” that is fine.

---

## Part C — Cloud SQL (PostgreSQL)

### C1. Create the instance (console — easiest for beginners)

1. In the console, search **“Cloud SQL”** → open **Cloud SQL**.  
2. Click **Create instance**.  
3. Choose **PostgreSQL**.  
4. **Instance ID**: e.g. `adaptive-sat-db`  
5. **Password**: set a strong password for the default `postgres` user (save it in a password manager).  
6. **Region**: choose the same region you will use for Cloud Run (e.g. `us-central1`).  
7. **Machine type**: for learning, **db-f1-micro** or a small shared core is often enough (check current options in console).  
8. **Storage**: default is usually fine to start.  
9. **Backups**: enable automated backups if offered.  
10. Click **Create**. Wait until the instance status is **Runnable** (can take several minutes).

### C2. Create database and user

1. Open your instance → **Databases** → **Create database**  
   - Name: `adaptive_sat` (or match your local DB name).  
2. **Users** → **Add user account**  
   - Create a dedicated user (e.g. `adaptive_app`) with a strong password.  
   - Grant this user access to database `adaptive_sat`.

### C3. Instance connection name (you will need this)

On the instance **Overview** page, find **Instance connection name**. It looks like:

```text
SAT1600:us-central1:adaptive-sat-db
```

Copy it exactly. Cloud Run uses this to attach to Cloud SQL securely.

### C4. Connection string for Cloud Run (important)

This project uses **SQLAlchemy + psycopg2** with `DATABASE_URL` from environment.

When the API runs on **Cloud Run** with **Cloud SQL attached**, a common pattern is the **Unix socket** URL (no public IP required for the app):

```text
postgresql://DB_USER:DB_PASSWORD@/DB_NAME?host=/cloudsql/INSTANCE_CONNECTION_NAME
```

Example (password must be URL-encoded if it contains special characters):

```text
postgresql://adaptive_app:YOUR_PASSWORD@/adaptive_sat?host=/cloudsql/SAT1600:us-central1:adaptive-sat-db
```

You will store this (or its components) in **Secret Manager** and inject it as `DATABASE_URL` on Cloud Run.

**Note:** If you use characters like `@`, `#`, `%` in the password, encode them for URLs (e.g. `%40` for `@`).

---

## Part D — Secret Manager

### D1. Why

Never commit real passwords or API keys to Git. **Secret Manager** holds secrets; Cloud Run reads them at runtime.

### D2. Create secrets (console)

1. Search **Secret Manager** → **Create secret**.  
2. Create at least:

| Secret name (example) | What to store |
|----------------------|----------------|
| `database-url` | Full `DATABASE_URL` string from C4 |
| `openai-api-key` | Your OpenAI API key (if you use generation in prod) |
| `admin-key` | Optional; for admin API routes |

3. For each secret, **Add version** and paste the value.

### D3. Service account permissions (later)

When you deploy Cloud Run, the **Cloud Run service account** must have **Secret Manager Secret Accessor** on these secrets. The first time you wire secrets in the deploy UI, GCP may prompt to grant access—accept for the runtime service account.

---

## Part E — Backend: Docker image and Artifact Registry

Cloud Run runs **containers**. Your repo does not ship a Dockerfile by default; you need one.

### E1. Create Artifact Registry (Docker repository)

1. Search **Artifact Registry** → **Create repository**.  
2. Format: **Docker**.  
3. Name: e.g. `adaptive-sat`  
4. Region: **same as Cloud SQL** (e.g. `us-central1`).  
5. Create.

Note the repository path, e.g.:

```text
us-central1-docker.pkg.dev/SAT1600/adaptive-sat
```

### E2. Dockerfile (backend)

Create a file `backend/Dockerfile` in your project (if not present) with content similar to:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

ENV PORT=8080
EXPOSE 8080

CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
```

Build from the **backend** directory (paths may need small adjustments to match your repo). Test locally with Docker if you can:

```bash
cd backend
docker build -t adaptive-sat-api:local .
```

### E3. Configure Docker for Artifact Registry

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

(Replace region if different.)

### E4. Build and push the image

From your project root (adjust paths and tags):

```bash
cd path/to/Adaptive_SAT/backend
docker build -t us-central1-docker.pkg.dev/SAT1600/adaptive-sat/adaptive-sat-api:v1 .
docker push us-central1-docker.pkg.dev/SAT1600/adaptive-sat/adaptive-sat-api:v1
```

### E5. Build in GCP with Cloud Build (no local Docker / no WSL)

Use this if **Docker Desktop** or **WSL** does not work on your PC. Google builds the image in the cloud; you only need **`gcloud`** and a browser login.

1. **Refresh login** (if you see “token expired”):

   ```bash
   gcloud auth login
   gcloud config set project sat1600
   ```

2. **Enable APIs** (once per project):

   ```bash
   gcloud services enable cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```

3. **From the repo root** (folder that contains `backend/Dockerfile`):

   ```bash
   cd path/to/Adaptive_SAT
   gcloud builds submit --tag us-central1-docker.pkg.dev/sat1600/adaptive-sat/adaptive-sat-api:v1 ./backend
   ```

4. When the build finishes, use that image URL in **Cloud Run** (Part F). No `docker build` or `docker push` on your machine.

---

## Part F — Deploy backend to Cloud Run

### F1. Deploy (console — beginner-friendly)

1. Search **Cloud Run** → **Create service**.  
2. **Deploy one revision from an existing container image** → select the image you pushed.  
3. **Region**: same as Cloud SQL.  
4. **Authentication**: for a public web app API, choose **Allow unauthenticated invocations** (you can restrict later).  
5. **Containers** → **Variables and secrets**:  
   - Add environment variable or secret reference:  
     - `DATABASE_URL` ← secret `database-url`  
     - `OPENAI_API_KEY` ← secret `openai-api-key` (if needed)  
     - `ADMIN_KEY` ← secret `admin-key` (optional)  
6. **Connections** → **Cloud SQL connections** → **Add connection** → select your instance.  
7. **Container port**: `8080` (must match Dockerfile `PORT`).  
8. Deploy.

### F2. Deploy (command line — alternative)

```bash
gcloud run deploy adaptive-sat-api \
  --image us-central1-docker.pkg.dev/SAT1600/adaptive-sat/adaptive-sat-api:v1 \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --add-cloudsql-instances SAT1600:us-central1:adaptive-sat-db \
  --set-secrets="DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest"
```

Adjust secret names and instance connection name.

### F3. Your API URL

After deploy, Cloud Run shows a URL like:

```text
https://adaptive-sat-api-xxxxx-uc.a.run.app
```

This is your **production API base URL** (no trailing slash). Use it in the frontend (`VITE_API_URL`) and mobile (`EXPO_PUBLIC_API_URL`).

### F4. CORS (required)

The backend file `backend/app/main.py` currently allows only **localhost** origins. For production you must add your real frontend origin (e.g. `https://your-app.web.app`) or make CORS configurable via environment variables.

Until you do this, the browser will block API calls from your deployed site.

---

## Part G — Database migrations and seed (on Cloud SQL)

You need the **same schema** as locally. Typical order:

1. **Migrate schema** with Alembic against Cloud SQL.  
2. Optionally **seed** skills and questions (seeding questions calls OpenAI and costs money).

### G1. Run Alembic against Cloud SQL

**Option A — From your PC using Cloud SQL Auth Proxy**

1. Install [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy).  
2. Run the proxy (example):

```bash
cloud-sql-proxy SAT1600:us-central1:adaptive-sat-db
```

3. In another terminal, set `DATABASE_URL` to connect via **localhost** (the proxy listens locally), e.g.:

```text
postgresql://adaptive_app:PASSWORD@127.0.0.1:5432/adaptive_sat
```

4. From `backend/`:

```bash
alembic upgrade head
```

**Option B — One-off job or Cloud Shell**

Same idea: any environment that can reach Cloud SQL with the right `DATABASE_URL` can run `alembic upgrade head`.

### G2. Seed skills (usually required)

```bash
python -m app.scripts.seed_skills
```

### G3. Seed questions (optional, costs OpenAI)

```bash
python -m app.scripts.seed_exam_questions --target 40
```

Skip or lower `--target` if you only want to test.

---

## Part H — Frontend (Vite) deployment

### H1. Build with production API URL

```bash
cd frontend
```

Create `.env.production`:

```env
VITE_API_URL=https://YOUR-CLOUD-RUN-URL
```

No trailing slash.

```bash
npm ci
npm run build
```

Output is in `frontend/dist/`.

### H2. Firebase Hosting (simple path)

1. Install [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`  
2. `firebase login`  
3. `firebase init hosting` — choose your GCP project, set **public directory** to `dist` (or `frontend/dist` depending on where you run the command).  
4. `firebase deploy --only hosting`

You get a URL like `https://sat1600.web.app` (Firebase often lowercases the hostname). Add this URL to **CORS** in the backend.

---

## Part I — Copy local database data to Cloud SQL

You already have data locally; use **dump → restore**.

### I1. Export from local PostgreSQL

On your machine (adjust user/database/host):

```bash
pg_dump -h localhost -U YOUR_LOCAL_USER -d adaptive_sat -F c -f adaptive_sat.dump
```

Or plain SQL:

```bash
pg_dump -h localhost -U YOUR_LOCAL_USER -d adaptive_sat -F p -f adaptive_sat.sql
```

### I2. Import into Cloud SQL (recommended: Cloud SQL Auth Proxy)

1. Start Cloud SQL Auth Proxy pointed at your instance.  
2. Create empty database + user on Cloud SQL if not done (Part C).  
3. If you use **schema from Alembic** on Cloud SQL first, you can use **data-only** dump:

```bash
pg_dump -h localhost -U YOUR_LOCAL_USER -d adaptive_sat --data-only -F p -f adaptive_sat_data.sql
```

Then:

```bash
psql -h 127.0.0.1 -p 5432 -U CLOUD_USER -d adaptive_sat -f adaptive_sat_data.sql
```

4. If you use **full dump including schema**, restore with:

```bash
pg_restore -h 127.0.0.1 -p 5432 -U CLOUD_USER -d adaptive_sat --no-owner --no-acl adaptive_sat.dump
```

Use `--no-owner --no-acl` to avoid errors when usernames differ.

### I3. Verify

Connect with `psql` and run `SELECT COUNT(*) FROM` a few tables, or log into the deployed app and confirm data.

---

## Part J — Mobile app (Expo)

Set the production API URL in `mobile/.env` (or EAS secrets):

```env
EXPO_PUBLIC_API_URL=https://YOUR-CLOUD-RUN-URL
```

Rebuild the app so the new URL is bundled.

---

## Part K — Checklists

### Before going live

- [ ] Billing and budget alert set  
- [ ] Cloud SQL created, database + user created  
- [ ] Secrets in Secret Manager  
- [ ] Docker image built and pushed  
- [ ] Cloud Run deployed with Cloud SQL connection and env/secrets  
- [ ] `alembic upgrade head` run against production DB  
- [ ] `seed_skills` run if needed  
- [ ] CORS updated with production frontend URL  
- [ ] Frontend built with `VITE_API_URL` and deployed  
- [ ] Local data migrated if needed (Part I)  
- [ ] Smoke test: register user, open practice/exam  

### Security (minimum)

- [ ] Do not commit `.env` or dumps to Git  
- [ ] Rotate keys if they were ever exposed  
- [ ] Restrict admin routes (`ADMIN_KEY`)  

---

## Part L — Troubleshooting

| Symptom | Likely cause |
|--------|----------------|
| Browser: “CORS policy” errors | Production frontend URL not allowed in `main.py` |
| Cloud Run: database connection failed | Wrong `DATABASE_URL`, Cloud SQL not attached, or user/password wrong |
| `pg_restore` permission errors | Use `--no-owner --no-acl` or align users |
| Frontend still calls `localhost` | Rebuild frontend; `VITE_API_URL` is compile-time |
| 403 on admin | `ADMIN_KEY` not set or wrong header |

---

## Part M — Where to get help

- **Cloud Run + Cloud SQL (Python):** [Connect Cloud SQL from Cloud Run](https://cloud.google.com/sql/docs/postgres/connect-run)  
- **Cloud SQL Auth Proxy:** [Install and run](https://cloud.google.com/sql/docs/postgres/connect-auth-proxy)  
- **Firebase Hosting:** [Get started](https://firebase.google.com/docs/hosting/quickstart)  

---

## Summary

1. Create GCP project and billing.  
2. Enable APIs; install `gcloud`.  
3. Create **Cloud SQL PostgreSQL**, database, user; save **instance connection name**.  
4. Put `DATABASE_URL` and API keys in **Secret Manager**.  
5. Add **Dockerfile**, build image, push to **Artifact Registry**.  
6. Deploy **Cloud Run** with Cloud SQL attached and secrets.  
7. Run **Alembic** (+ optional seed).  
8. Fix **CORS**, build frontend with **`VITE_API_URL`**, deploy (e.g. **Firebase Hosting**).  
9. **Migrate local data** with `pg_dump` / `pg_restore` or `psql` via proxy.  

This is the full path from zero GCP experience to a deployed Adaptive SAT stack with optional data migration.
