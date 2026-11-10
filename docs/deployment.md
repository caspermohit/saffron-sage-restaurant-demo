# Shared demo deployment

The demo uses one shared MySQL database, a Laravel API on Railway and the Next.js frontend on Vercel. Its public login is `demo@saffron.test` / `TrySaffron2026!`. Use a new sample database rather than any live restaurant database.

## Railway

Create a project with a MySQL service and an API service using `backend/` as its source/root directory. The Dockerfile serves HTTP on port 8080. Set the target port and `PORT=8080`. Use `/up` as the HTTP health path.

Configure API variables:

- `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://<API domain>`
- `APP_KEY`: generate a stable key with `php artisan key:generate --show`
- `DB_CONNECTION=mysql`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`: reference the Railway MySQL service's variables; keep them out of GitHub
- `CACHE_STORE=database`, `SESSION_DRIVER=database`, `QUEUE_CONNECTION=database`, `LOG_CHANNEL=stderr`
- `RESTAURANT_DEMO_MODE=true`
- `STAFF_EMAIL=demo@saffron.test`, `STAFF_PASSWORD=TrySaffron2026!`
- `RESTAURANT_WIFI_NAME=Saffron Demo Guest`, `RESTAURANT_WIFI_PASSWORD=sample-wifi-only`
- `RESTAURANT_BANK_INSTRUCTIONS=Demo only. Do not send money. Ask staff to simulate payment confirmation.`

Before serving the first deployment, run:

```bash
php artisan migrate --force
php artisan db:seed --force
php artisan restaurant:demo
```

Use a Railway pre-deploy command for these database operations. They run in a separate container, so they should not generate filesystem-only configuration or application keys. Keep APP_KEY in the service's environment. Seeding is idempotent and does not reset existing passwords or table orders.

The backend directory includes the deployment settings in `railway.json` for configurations that support Railway's legacy Config as Code format. For new Infrastructure as Code projects, copy those build, healthcheck and pre-deploy settings into the service definition. The application itself does not depend on a Railway-specific runtime.

## Vercel

Create a Next.js project from this GitHub repository with root directory `frontend`. Set:

- `NEXT_PUBLIC_SHARED_DEMO=true`
- `API_INTERNAL_URL=https://<Railway API domain>`

Both are needed at build time. Redeploy the frontend after changing either value. All browser requests go through the same-origin `/api/*` proxy. This avoids putting database credentials or server authentication tokens in browser code.

For a link that visitors can open, ensure this demo's deployment access settings permit your intended testers. Only the public sample environment should expose the documented test credentials.

## After deployment

Open the frontend URL, sign in, open a guest table on another device, place an order, and confirm it appears in the staff kitchen. The frontend updates every five seconds. Staff can then progress the order, resolve a service call and simulate settling the bill.

Railway hosting and MySQL use the selected account's plan/credits. No paid plan should be assumed from the repository alone. Remove the demo services when testing is finished if you do not want them running.
