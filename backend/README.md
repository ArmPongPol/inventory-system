# Inventory Management System: backend

The backend of the Inventory Management System: a single NestJS 11 application
(a modular monolith) backed by PostgreSQL through TypeORM. Every feature is a
Nest module in this one process, sharing one database and one deployment. It
listens on port 3001.

Current modules: authentication (JWT access tokens plus rotating refresh
sessions), users, health checks, master data (categories, units, warehouses,
products) and inventory (stock levels, stock movements, reservations).

## Project layout

```
src/
  main.ts, app.module.ts   bootstrap; global guards, filters, interceptors
  config/                  env loading and validation (one file per area)
  common/                  cross-cutting pieces, no business logic
  database/                data source for the CLI, migrations, seeds
  modules/
    auth/                  login, refresh, logout, register, /auth/me
    users/                 users table and admin CRUD
    sessions/              refresh sessions (used by auth and users)
    health/                liveness and readiness probes
    categories/            product categories
    units/                 units of measure
    warehouses/            warehouses
    products/              products (uses categories and units)
    inventory/             stock levels, the movement ledger and /stock operations
```

### Adding a feature module

1. Create `src/modules/<feature>/` with `<feature>.module.ts`, a controller,
   a service, `entities/` and `dto/`, like `users/`.
2. Register its entities with `TypeOrmModule.forFeature([...])` in that module
   (entities are picked up by `autoLoadEntities`), and add the module to
   `imports` in `src/app.module.ts`.
3. Every route requires a valid access token by default. Use
   `@RequiredRoles(UserRoleEnum.ADMIN)` to restrict a route, `@Public()` to
   open one, and `@CurrentUser()` to read the caller.
4. To use another module's data, import that module and inject the service it
   exports (e.g. `UsersModule` exports `UsersService`). Don't inject another
   module's repository directly, so each table keeps a single owner.
5. Generate a migration for the new tables: `npm run migration:generate`.

## Setup

```bash
npm install
cp .env.example .env        # then adjust; validated at startup
docker compose up -d        # local Postgres (reads the same .env)
npm run migration:generate  # first time only: creates the initial migration from the entities
npm run migration:run       # create/upgrade the schema
npm run seed:admin          # first administrator (ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD)
```

## Run

```bash
npm run start:dev       # watch mode
npm run build
npm run start:prod      # one process: node dist/main
npm run start:cluster   # one worker per CPU: node scripts/cluster.mjs
```

Health probes (public, not logged on success): `GET /health/live` (process up)
and `GET /health/ready` (database reachable). Swagger UI is at `/docs` when
`DOCS_ENABLED=true` (on by default outside production).

## Tests

```bash
npm test            # unit tests
npm run test:cov
npx tsc --noEmit && npx eslint src test
```

## Authentication

| Endpoint              | Auth   | Body               | Result |
| --------------------- | ------ | ------------------ | ------ |
| `POST /auth/register` | public | user fields        | new USER account |
| `POST /auth/login`    | public | `identifier, password` | `{ accessToken, refreshToken, tokenType }` |
| `POST /auth/refresh`  | public | `refreshToken`     | new `{ accessToken, refreshToken, tokenType }` |
| `POST /auth/logout`   | public | `refreshToken`     | always `200 { data: null }` |
| `GET /auth/me`        | bearer | none               | the current user |

`identifier` is the username or the email, case-insensitively. It is treated
as an email when it contains `@` (usernames may only contain letters, digits,
`.`, `_` and `-`), otherwise as a username. A wrong identifier and a wrong
password get the same `401 Invalid username/email or password`.

Access tokens (`JWT_ACCESS_TTL`, 15 min by default) are stateless. Each
request re-checks the user's status and role. That lookup is cached in
process for `USER_CACHE_TTL_MS` (5 s), and a change made through this service
clears the cache immediately in the process that made it.

### Refresh sessions

Each login creates a row in `refresh_sessions`. The refresh token is a JWT
with the claims `{ sub, sid, gen, type: 'refresh' }`, where `sid` is the
session id and `gen` is its generation.

- **Rotation.** A refresh with the current generation moves the session to
  `generation + 1` and returns a new token pair. This is a single conditional
  `UPDATE`, so only one of several concurrent refreshes performs the rotation.
- **Grace window.** A token one generation old is accepted for
  `REFRESH_REUSE_GRACE_SECONDS` (30 s) after a rotation. It gets back the
  *same* refresh token the first caller received, plus a fresh access token.
  This covers two tabs refreshing at once, or a retried request.
- **Reuse detection.** Any older token, or the previous token after the grace
  window, is treated as stolen. The whole session is revoked and the call
  returns `401 Invalid or expired refresh token`, which also logs out the
  legitimate holder.
- **Lifetime.** Each refresh token is valid for `JWT_REFRESH_TTL` (7 d) from
  its rotation. The session as a whole ends `REFRESH_SESSION_MAX_DAYS` (30 d)
  after login, however often it is refreshed.
- **Revocation.** `POST /auth/logout` revokes the token's session. It accepts
  expired tokens, and is idempotent. All of a user's sessions are revoked
  when their password changes, when they are set to INACTIVE, when their role
  changes, and on `DELETE /users/:id`.
- **Brute force.** After `LOGIN_MAX_FAILURES` (5) wrong passwords for an account
  within `LOGIN_FAILURE_WINDOW_SECONDS` (15 min), `POST /auth/login` answers
  429 for that account until the window ends, without running argon2. It is
  keyed by account, not IP, so colleagues behind one NAT address can't lock
  each other out, and the username and email of one account share the same
  budget. Unknown identifiers are counted the same way. Counters are per worker process.

Login also upgrades password hashes stored with older argon2 parameters to
the current ones (argon2id, 19 MiB, t=2, p=1).

## Users

Roles are `ADMIN` and `USER`. All `/users` routes require ADMIN. Other
modules that need user details call `UsersService` directly.

The service refuses to demote, deactivate or delete the last active
administrator, and returns `409 Cannot remove the last administrator`.

## Inventory

Every route below needs a signed-in user. Lists take `page` and `limit` and
return `{ items, total, page, limit }`.

| Endpoints | Read | Write |
| --- | --- | --- |
| `/categories`, `/units`, `/warehouses`, `/products` | everyone | ADMIN (`POST`, `PATCH /:id`, `DELETE /:id`) |
| `GET /inventory`, `GET /inventory/low-stock`, `GET /stock-movements` | everyone | none |
| `POST /stock/receive`, `issue`, `transfer`, `reserve`, `release` | | USER and ADMIN |
| `POST /stock/adjust` | | ADMIN |

Master data:

- `DELETE` on categories, warehouses and products only sets `is_active =
  false`, because history keeps pointing at them. Units have no flag: a unit
  is deleted outright, and that fails with 409 while a product uses it.
- SKUs and warehouse codes are stored uppercased, category and unit names
  as typed. All four are unique, and duplicates get a 409.
- A product can only be given an active category. Inactive products and
  warehouses accept no new stock movements, but reservations on them can
  still be released.

Stock operations (all quantities are `> 0` with at most 4 decimals):

| Operation | Effect on `inventory` | Movement rows |
| --- | --- | --- |
| `receive` | `quantity += q` (creates the row at 0 if needed) | `IN +q` |
| `issue` | `quantity -= q`, needs `q <= available`; with `fromReserved: true` also `reserved -= q` and needs `q <= reserved` | `OUT -q` |
| `adjust` | `quantity = countedQuantity` (400 if unchanged, 409 if below reserved) | `ADJUSTMENT ±diff` |
| `transfer` | `-q` at the source, `+q` at the destination | `TRANSFER_OUT -q` and `TRANSFER_IN +q`, both with `reference_type = TRANSFER` and the same `reference_id` (returned as `transferId`) |
| `reserve` / `release` | `reserved ± q`, needs enough available / reserved | none |

`available = quantity - reserved_quantity`. Not enough stock is a 409. Each
operation is one transaction: the inventory row and its movement rows are
written together or not at all. The check and the change are a single
conditional `UPDATE`, so concurrent requests can't oversell. A transfer
locks both rows in a fixed order, so opposite transfers can't deadlock.

Quantities are `numeric(18,4)` and come back as **strings** (`"12.5000"`).
The arithmetic runs in Postgres, so nothing is rounded through a JS float.

`GET /inventory/low-stock` lists active products whose total quantity, or
the quantity in `warehouseId` if one is given, is below `minimum_stock`.
`GET /stock-movements` filters by `productId`, `warehouseId`,
`movementType`, `referenceType`, `referenceId`, `from` (inclusive) and
`to` (exclusive). Results are newest first.

## Data model

The schema is managed by TypeORM migrations in `src/database/migrations`.

`users`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | primary key |
| `username` | `varchar(320)` | unique (`UQ_users_username`), stored lowercased; letters, digits, `.`, `_`, `-` |
| `email` | `varchar(320)` | unique (`UQ_users_email`), stored lowercased |
| `password` | `varchar` | argon2id hash, never returned by the API |
| `first_name`, `last_name` | `varchar(100)` | |
| `role` | `ADMIN` or `USER` | indexed; no database default (the API defaults to `USER`) |
| `status` | `ACTIVE` or `INACTIVE` | indexed; default `ACTIVE` |
| `created_at`, `updated_at` | `timestamptz` | |

`refresh_sessions` has one row per login (see Refresh sessions) and references
`users.id` with `ON DELETE CASCADE`.

Inventory tables. Every foreign key is `ON DELETE RESTRICT`, quantities are
`numeric(18,4)` and timestamps are `timestamptz`.

| Table | Keys and constraints |
| --- | --- |
| `categories` | `name` unique; `is_active` |
| `units` | `name` and `symbol` each unique |
| `warehouses` | `code` unique; `is_active` |
| `products` | `sku` unique; `category_id`, `unit_id` nullable and indexed; `minimum_stock >= 0`; `is_active` |
| `inventory` | unique `(product_id, warehouse_id)`; `0 <= reserved_quantity <= quantity` |
| `stock_movements` | append-only; `quantity` is the signed change, `<> 0`; `after_quantity = before_quantity + quantity`; `created_by` references `users.id`; indexed on `(product_id, created_at)`, `(warehouse_id, created_at)`, `(reference_type, reference_id)` |

`stock_movements.created_at` defaults to `clock_timestamp()`, not `now()`
(the transaction's start). It is taken after the inventory row lock, so for
each product and warehouse the rows sorted by `created_at` chain correctly:
each `before_quantity` is the previous row's `after_quantity`.

## Configuration

Every variable is validated at startup (`src/config/env.validation.ts`).

| Variable | Default | Meaning |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `APP_NAME` | none | Swagger title |
| `APP_HOST` | `127.0.0.1` | interface to listen on (`0.0.0.0` in containers) |
| `PORT` | `3001` | HTTP port |
| `LOG_LEVEL` | `log` | `fatal`, `error`, `warn`, `log`, `debug` or `verbose` |
| `API_PREFIX` | none | global route prefix |
| `API_VERSION` | none | reserved |
| `CORS_ORIGINS` | none (no cross-origin requests allowed) | comma-separated allowed origins |
| `CORS_CREDENTIALS` | `true` | CORS `credentials` |
| `DATABASE_HOST` | none (falls back to `HOST`) | Postgres host; one of the two is required |
| `HOST` | none | older name for `DATABASE_HOST` |
| `DATABASE_PORT` | `5432` | Postgres port |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` / `DATABASE_DATABASE` | required | credentials and database name |
| `DATABASE_POOL_SIZE` | `10` | connections per process |
| `DATABASE_SYNCHRONIZE` | `false` | never `true` in production |
| `DB_LOGGING` | `false` | log every SQL query |
| `DATABASE_SSL` | `false` | TLS to Postgres |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `true` | verify the server certificate |
| `DOCS_ENABLED` | `true`, or `false` when `NODE_ENV=production` | serve Swagger |
| `DOCS_PATH` | `docs` | Swagger path |
| `DOCS_DESCRIPTION` | none | Swagger description |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | required | at least 32 characters each, and they must differ |
| `JWT_ACCESS_TTL` | `15m` | access token lifetime |
| `JWT_REFRESH_TTL` | `7d` | lifetime of one refresh token |
| `JWT_ISSUER` / `JWT_AUDIENCE` | `inventory-backend` / `inventory-clients` | `iss` / `aud` claims |
| `REFRESH_SESSION_MAX_DAYS` | `30` | absolute session lifetime |
| `REFRESH_REUSE_GRACE_SECONDS` | `30` | how long the previous refresh token is still accepted |
| `USER_CACHE_TTL_MS` | `5000` | user cache for token checks (0 turns it off) |
| `HASH_CONCURRENCY` | CPU count | concurrent argon2 operations per process |
| `HASH_QUEUE_MAX` | `200` | callers that may wait for a hashing slot before getting 503 `Server busy, please retry` |
| `WORKERS` | CPU count | worker processes for `start:cluster` |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` | `admin`, none, none, `System`, `Administrator` | `seed:admin` only |

Database connections also get these server-side limits:

- `statement_timeout` 5 s
- `idle_in_transaction_session_timeout` 10 s
- `application_name=inventory-backend`
- a 3 s connect timeout

Queries slower than 500 ms are logged. The migration CLI turns off the
statement timeout. Postgres errors map to HTTP statuses as follows:

- constraint and format errors: 400
- unique violations: 409 (the services turn the ones they expect into specific
  messages, e.g. `A product with that SKU already exists.`)
- lock and statement timeouts: 503

## Scaling and deployment

- **Cluster.** `npm run start:cluster` runs `dist/main.js` in `WORKERS`
  processes. A crashed worker is restarted with backoff (0.5 s up to 30 s),
  and SIGTERM/SIGINT are forwarded so every worker shuts down gracefully.
  Unless `HASH_CONCURRENCY` is set, each worker gets its share of the CPUs for
  hashing.
- **Per-worker state.** Each worker has its own database pool and caches.
  Plan for `WORKERS × DATABASE_POOL_SIZE` connections. Another worker sees a
  change after at most the cache TTL (5 s for users).
- **HTTP server.** The service uses helmet's security headers, does not send
  `X-Powered-By`, and sets keep-alive timeouts of 65 s and 66 s. Those are
  longer than a typical 60 s proxy idle timeout.

### Container

```bash
podman build -t inventory-backend -f Containerfile .
podman run --env-file .env.production -p 3001:3001 inventory-backend
```

The image is multi-stage on `node:24-alpine`. Both stages use musl, so
argon2's prebuilt binary matches. It runs as `node`, with
`NODE_ENV=production`, `UV_THREADPOOL_SIZE=8` and `APP_HOST=0.0.0.0`, and
starts `scripts/cluster.mjs`. Migrations are not run by the image; run
`npm run migration:run` before rolling out. Podman and Buildah read
`.containerignore`. For `docker build`, copy it to `.dockerignore`.
