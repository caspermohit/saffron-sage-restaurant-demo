# Free shared demo: Render + Supabase

One Render **Free web service** runs Next.js, Laravel/PHP-FPM and nginx. A separate Supabase **Free project** stores all persistent data in PostgreSQL. MySQL remains supported for local installations and other deployments.

## Supabase

Create a new dedicated sample project on the Free plan, preferably near Render's Virginia region. Do not reuse a live application database. In the project's **Connect** panel choose **Session pooler** (port **5432**); this supports IPv4 connections from Render. Copy its host and full username (`postgres.<project-ref>`) into Render's private environment settings, along with the database password. Use `postgres` as the database name and `DB_SSLMODE=require`.

The app creates and uses a private `restaurant` schema (`DB_SCHEMA=restaurant`). Leave that schema out of Supabase's Data API exposed schemas. Laravel uses the database connection and Sanctum authentication directly; Supabase anonymous/service-role API keys are not needed in the frontend or source code.

## Render

Deploy [this repository as a Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint). The root `render.yaml` defines exactly one `plan: free` Docker web service using `deploy/render.Dockerfile`. Keep the repository root as the Docker context; do not set `frontend` or `backend` as the root directory for this combined image.

Enter the three requested private variables from the Supabase Session pooler:

- `DB_HOST`: pooler host shown in Connect
- `DB_USERNAME`: full pooler username including project reference
- `DB_PASSWORD`: dedicated database password

The Blueprint supplies the remaining settings and generates a stable `APP_KEY_BASE64`. The startup script converts that value to Laravel's `base64:` APP_KEY format. Preserve the key across deployments.

Free Render instances have no pre-deploy commands or shell access. The container's startup script prepares the database schema, runs pending migrations, seeds the public demo account/menu and adds sample visits only if no orders exist. Restarts do not reset passwords or erase orders. If any setup command fails, the container stops so the failure is visible in Render logs.

nginx listens on port 8080. `/api/*` and `/up` go to Laravel; other requests go to the standalone Next.js server on localhost:3000. Render terminates public HTTPS. No database credentials enter the Next.js build.

After Render reports a successful deployment, open the assigned `https://…onrender.com` URL. Sign in with `demo@saffron.test` / `TrySaffron2026!`, open guest ordering on another device, place an order and verify it appears in the staff kitchen. Then test order progression, a service request, and a simulated payment. All users share sample data; this demo never processes real payments.

## Free-plan limits

Render sleeps after 15 minutes without requests and may take about a minute to wake. Its workspace shares 750 free instance hours per calendar month; other services consume the same allowance. Bandwidth and build limits also apply. Supabase Free projects can pause after a week of low activity. This setup is for occasional demonstrations, not a live restaurant. Do not enable paid compute, upgrades or usage add-ons as part of the free demo.

Official references: [Render free services](https://render.com/docs/free), [Render Blueprint specification](https://render.com/docs/blueprint-spec), [Supabase Laravel guide](https://supabase.com/docs/guides/getting-started/quickstarts/laravel), [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Validation

The backend feature suite passes against both SQLite and an isolated local PostgreSQL database (17 tests, 89 assertions each). The Blueprint validates against Render's published JSON schema. Sample fixtures were seeded twice on PostgreSQL to confirm repeat startup preserves orders. The Docker image still needs its first Render build; Docker is not installed on the development machine.
