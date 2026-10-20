# Weekly Revenue Trend Dashboard

A small full-stack app that reproduces the **"This Week's Revenue Trend vs Previous Period"** card from the reference video, with an admin panel to manage the data behind it.

| Part | Stack | Location |
| --- | --- | --- |
| Public view (`/`) | Next.js 15 (App Router) + React 19 + TypeScript | `frontend/` |
| Admin panel (`/admin`) | Same Next.js app, login-protected | `frontend/app/admin` |
| API | Node.js + Express + `pg` | `backend/` |
| Database | PostgreSQL 16 (plain SQL migrations) | `backend/db` |

![Dashboard](docs/dashboard-compare.png)

---

## Features

**Public view**
- Header with the 3 series toggles (POS Revenue, Eatclub Revenue, Labour Costs), **Compare to Previous** toggle and **Export PNG**.
- KPI cards: Total Revenue, Average per Day, Total Covers, with `vs <previous>` and the % change in compare mode.
- Grouped/stacked bar chart per day (Mon–Sun):
  - current week: POS + Eatclub stacked, Labour separate;
  - previous week (compare mode): Direct (POS) + Eatclub stacked, Labour separate, in lighter colours.
- Positive/negative **event markers** above a day (with an optional note, shown on hover).
- Animated bars (grow-in and on every data/toggle change), auto-scaled "nice" Y axis (e.g. 0 / 0.75k / 1.5k / 2.25k / 3k), hover tooltip per day, legend that follows the toggles.
- Keyboard and screen-reader friendly: every day column is focusable (Tab) and shows its tooltip on focus, with a text summary of its values. Responsive down to 320 px. Loading skeleton and error boundary.
- Data is fetched server-side with `no-store` and refreshed when the tab regains focus (and every 30 s), so what the admin saves is what the page shows.

**Admin**
- Email + password login (bcrypt hashes, JWT in an `httpOnly` cookie, simple brute-force limit).
- Paginated week list, add a week (any date → its Monday), edit the 7 days in a grid (POS, Eatclub, Labour, Covers, event impact + note) with live totals and inline validation, delete a week, preview any week on the dashboard.
- Saving sends only the days that changed (`PATCH`), and a browser prompt warns before leaving with unsaved edits.
- The dashboard shows the **most recent week** and compares it with the week right before it (`/?week=YYYY-MM-DD` shows a specific week).

![Admin – edit week](docs/admin-edit-week.png)

---

## Install and run locally (fresh Linux / macOS)

You need **Node.js ≥ 20**, **npm** and **PostgreSQL ≥ 14**. The steps below assume nothing is installed.

### 1. Install Node.js (via nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# open a new terminal (or `source ~/.bashrc` / `source ~/.zshrc`), then:
nvm install 22
nvm use 22
node -v   # v22.x
```

### 2. Install and start PostgreSQL

Pick **one** option.

**Option A – macOS (Homebrew)**

```bash
# install Homebrew first if needed: https://brew.sh
brew install postgresql@16
brew services start postgresql@16
echo 'export PATH="$(brew --prefix postgresql@16)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

# Homebrew creates a superuser named after your macOS user, without a password.
# Give the app a "postgres" user with password "postgres" so the default .env works:
psql postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"
```

**Option B – Ubuntu / Debian**

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
# set a password for the default "postgres" user so the app can log in over TCP:
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

**Option C – Docker** (if you already have Docker)

```bash
docker compose up -d        # from the project root, uses docker-compose.yml
```

Check it works:

```bash
psql "postgres://postgres:postgres@localhost:5432/postgres" -c "select version();"
```

### 3. Backend (API + database)

```bash
cd backend
cp .env.example .env          # edit DATABASE_URL / JWT_SECRET / ADMIN_* if needed
npm install

npm run db:setup              # = db:create + db:migrate + db:seed
npm run dev                   # API on http://localhost:4000
```

What `db:setup` does:

| Script | What it does |
| --- | --- |
| `npm run db:create` | Creates the database named in `DATABASE_URL` (`revenue_dashboard`) if it doesn't exist. |
| `npm run db:migrate` | Applies every pending file in `db/migrations/*.sql` in order, each in a transaction, and records it in `schema_migrations`. Safe to re-run. |
| `npm run db:seed` | Creates/updates the admin user from `.env` and inserts 4 sample weeks ending with the current week (existing weeks are left alone). |

Other DB scripts: `npm run db:status` (list applied/pending migrations), `npm run db:reset` (delete all weeks and re-insert the sample data).

Quick check: `curl http://localhost:4000/api/health` → `{"status":"ok","database":"ok"}`.

### 4. Frontend (view + admin)

In a second terminal:

```bash
cd frontend
cp .env.example .env.local    # API_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

### 5. Use it

- Dashboard: <http://localhost:3000>
- Admin: <http://localhost:3000/admin> — default login **admin@example.com / Admin@123** (from `backend/.env`).

Edit a number in the admin, click **Save changes**, then switch back to the dashboard tab: it refreshes with the new values.

### Production build (optional)

```bash
cd backend && NODE_ENV=production JWT_SECRET=$(openssl rand -hex 32) npm start
cd frontend && npm run build && npm start
```

### Tests

```bash
cd backend
npm test                      # unit tests: aggregation, validation, pagination, error shape (no DB needed)

# end-to-end API tests against a real, THROWAWAY database (it is created, migrated and reset):
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/revenue_dashboard_test npm run test:integration
```

Both use the built-in `node:test` runner and `fetch`, so no test libraries are installed.

---

## How it fits together

```
Browser ──► Next.js :3000 ──(server components fetch)──► Express API :4000 ──► PostgreSQL
   │              │
   └─ /api/* ─────┘  next.config.mjs rewrites /api/* to the API, so the admin
                     session cookie is first-party and no CORS setup is needed.
```

- `middleware.ts` redirects `/admin/*` to `/admin/login` when there is no session cookie; the API verifies the JWT on every admin request.
- The public page is a server component (`force-dynamic`, `cache: 'no-store'`) that passes data to the client chart component.

### Database schema (`backend/db/migrations/001_init.sql`)

```
admin_users    (id, email UNIQUE, name, password_hash, created_at)
report_weeks   (id, week_start DATE UNIQUE  -- must be a Monday, created_at, updated_at)
daily_metrics  (id, week_id → report_weeks ON DELETE CASCADE, day_index 0..6,
                pos_revenue, eatclub_revenue, labour_cost NUMERIC(12,2) ≥ 0,
                covers INT ≥ 0, event_impact 'positive'|'negative'|NULL, event_note,
                UNIQUE (week_id, day_index))
```

To change the schema, add a new file such as `002_add_something.sql` and run `npm run db:migrate`.

### API

| Method | Path | Auth | Success | Description |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | – | 200 | API + DB health |
| GET | `/api/public/revenue-trend?week=YYYY-MM-DD` | – | 200 | Latest week (or the week containing `week`), previous-week values per day, KPI summary and % change |
| GET | `/api/public/weeks?page=&pageSize=` | – | 200 | Paginated weeks that have data |
| POST | `/api/auth/login` | – | 200 | `{ email, password }` → sets the `admin_token` cookie, returns `{ user, token }` |
| POST | `/api/auth/logout` | – | 204 | Clears the cookie |
| GET | `/api/auth/me` | admin | 200 | Current admin |
| GET | `/api/admin/weeks?page=&pageSize=` | admin | 200 | Paginated weeks with totals, newest first |
| POST | `/api/admin/weeks` | admin | 201 | `{ weekStart: 'YYYY-MM-DD' (Monday), days?: Day[] }` — days not sent are zeros |
| GET | `/api/admin/weeks/:id` | admin | 200 | One week with its 7 days |
| PATCH | `/api/admin/weeks/:id` | admin | 200 | `{ days: Day[] }` — only the days sent are changed |
| DELETE | `/api/admin/weeks/:id` | admin | 204 | Idempotent delete |

`Day = { dayIndex: 0..6, posRevenue, eatclubRevenue, labourCost, covers, eventImpact: 'positive'|'negative'|null, eventNote }`.

**Pagination:** `page` (1-based, default 1) and `pageSize` (1–100, default 20). Response: `{ data: [...], pagination: { page, pageSize, totalItems, totalPages } }`.

**Errors** always have the same shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": ["days[0].covers must be >= 0"] } }
```

| Status | `code` | When |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Malformed JSON, bad id, bad query parameters |
| 401 | `UNAUTHORIZED` | Missing/expired session, wrong password |
| 404 | `NOT_FOUND` | Unknown week or route |
| 409 | `CONFLICT` | A week with that start date already exists |
| 422 | `VALIDATION_ERROR` | Body is well-formed but values are invalid |
| 429 | `RATE_LIMITED` | Too many failed logins (10 per 15 min per IP) |
| 500 | `INTERNAL_ERROR` | Anything unexpected (details are logged, never returned) |
Admin endpoints also accept `Authorization: Bearer <token>` (the token is returned by `/login`), handy for curl/Postman:

```bash
TOKEN=$(curl -s -X POST localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin@123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s localhost:4000/api/admin/weeks -H "Authorization: Bearer $TOKEN"
```

### Project structure

```
backend/
  db/migrations/001_init.sql   schema
  db/migrate.js                migration runner (up / status)
  db/create-db.js, db/seed.js
  src/app.js, src/server.js    Express app
  src/routes/{auth,public,admin}.js
  src/services/revenue.js      pure aggregation + validation (unit tested)
  src/services/weeksRepo.js    SQL queries (single-statement bulk upsert)
  src/utils/httpError.js       the API error contract
  src/utils/pagination.js
  test/                        unit + integration tests
frontend/
  app/page.tsx                 public view (server component) + loading.tsx / error.tsx
  app/admin/...                login, weeks list, week editor
  components/RevenueTrendCard.tsx   the chart card from the video (state + composition)
  components/revenue-trend/    header, KPI cards, chart, tooltip, legend, PNG export hook
  components/admin/            admin shell, week editor hook + table, skeletons
  middleware.ts                admin route guard
  next.config.mjs              /api/* proxy to the backend
docs/adr/                      architecture decision records (why plain SQL, cookie auth, hand-built chart)
```

---

## Troubleshooting

- **`password authentication failed for user "postgres"`** – the password in `DATABASE_URL` doesn't match. Re-run the `ALTER USER`/`CREATE ROLE` command from step 2 or edit `backend/.env`.
- **`ECONNREFUSED 127.0.0.1:5432`** – PostgreSQL isn't running (`brew services start postgresql@16` / `sudo systemctl start postgresql` / `docker compose up -d`).
- **Dashboard says "Cannot reach the API"** – start the backend (`cd backend && npm run dev`) and check `API_URL` in `frontend/.env.local`.
- **Port already in use** – change `PORT` in `backend/.env` (and `API_URL` in the frontend) or run `npx next dev -p 3001` for Next.js.
- **Google font download warning in dev** – harmless offline; the page falls back to the system font.
