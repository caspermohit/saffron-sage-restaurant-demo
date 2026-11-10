# Restaurant frontend

Next.js and TypeScript UI for the Saffron & Sage restaurant application.

See the [project README](../README.md) for the public test login, installation and walkthrough.

- `API_INTERNAL_URL`: Laravel API destination, read at build time; defaults to `http://127.0.0.1:8000`.
- `NEXT_PUBLIC_SHARED_DEMO=true`: display the public test credentials and shared-demo notice. Requests still use Laravel and MySQL.

Run `npm run build` before publishing changes. Never put database credentials or the Laravel APP_KEY in a `NEXT_PUBLIC_*` variable.
