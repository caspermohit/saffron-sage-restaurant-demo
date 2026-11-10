# AWS container deployment

This repository includes two Linux Docker image definitions. Images have not been built or pushed here because Docker is unavailable on the development host. No AWS resources have been created.

## Suggested topology

Use ECS Fargate with both containers in one task: `frontend:3000` and `backend:8080`. Both share networking, so build the frontend with `API_INTERNAL_URL=http://127.0.0.1:8080`. Put an Application Load Balancer with ACM HTTPS in front of frontend port 3000. Keep backend port 8080 private. Use RDS MySQL 8.4 in private subnets; allow port 3306 only from the task security group. The local `compose.yaml` instead uses its internal `api` DNS service.

The Next.js API proxy destination is compiled at image build time. Set the correct `API_INTERNAL_URL` when building, not only as an ECS runtime variable. A public guest QR must use your HTTPS production domain; QR codes derive from the browser origin.

## Build and push

Install Docker with Buildx and AWS CLI, authenticate to the intended account, and create private ECR repositories named `saffron-frontend` and `saffron-backend`. Set lifecycle and scanning policies appropriate for your account. From the repository root:

```bash
export AWS_ACCOUNT_ID=your-account-id
export AWS_REGION=ca-central-1
export IMAGE_TAG=your-release-sha
export API_INTERNAL_URL=http://127.0.0.1:8080
bash deploy/push-ecr.sh
```

The script pushes exactly these two repository tags. It builds `linux/amd64`; set the ECS runtime platform to X86_64. For ARM64, change both the build platform and ECS runtime setting.

## ECS task configuration

Use both ECR image tags in a Fargate task with at least 1 vCPU / 2 GB memory as an initial allocation, then measure usage. Set frontend `PORT=3000`, `HOSTNAME=0.0.0.0`, `NODE_ENV=production`. The images run as non-root UID 1001. Backend contains nginx and PHP-FPM with supervisord, serving port 8080. Health paths: frontend `/`, API `/up`. Send container stdout/stderr to CloudWatch.

Backend environment:

- `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://your-domain`
- `DB_CONNECTION=mysql`, `DB_HOST=<RDS endpoint>`, `DB_PORT=3306`, `DB_DATABASE=saffron`, `DB_USERNAME=<app user>`
- `CACHE_STORE=database`, `SESSION_DRIVER=database`, `QUEUE_CONNECTION=database`, `LOG_CHANNEL=stderr`
- `RESTAURANT_NAME`, `RESTAURANT_CURRENCY=CAD`, `RESTAURANT_TAX_PERCENT=13`
- `RESTAURANT_WIFI_NAME`, `RESTAURANT_BANK_INSTRUCTIONS`, `STAFF_EMAIL`

Inject `APP_KEY`, `DB_PASSWORD`, `STAFF_PASSWORD`, and `RESTAURANT_WIFI_PASSWORD` from Secrets Manager through ECS secret references. Generate a stable APP_KEY with `php artisan key:generate --show`. Use a strong staff password (at least 12 characters). Do not bake `.env` into an image. The sample seeder creates one manager only if that email is absent; rerunning does not reset a password.

Use TLS to RDS: download the official Amazon RDS CA bundle into the backend image or mount it through your delivery process, set `MYSQL_ATTR_SSL_CA` to that path, and enforce TLS for the DB user. Laravel's MySQL connection already honors this variable. Never disable certificate validation.

Enable ECS Exec for operations if your account policies permit it. Run `php artisan migrate --force` and then `php artisan db:seed --force` as a one-off task using the backend image, the same secrets and RDS access. Finish migrations before sending traffic to the new service. The seeder installs the starting menu and generates unguessable table QR tokens. Print production table QR cards from the workspace. Never run `restaurant:demo` in production.

Allow outbound HTTPS if serving the bundled Google Fonts and Unsplash image URLs. Self-host approved brand photos/fonts if your deployment requires no third-party browser requests. There is no image upload feature yet; existing menu photos are remote URLs, not S3 objects.

## Operational limits

- This implementation is a single restaurant workspace with one staff permission level. User/role management, multi-location support, refunds, payment request cancellation, inventory and accounting integrations are not included.
- Kitchen, table and guest updates poll every five seconds. Database cache provides shared rate limits across tasks.
- Table QR codes are bearer capabilities: anyone holding one can join that table's current visit and see its bill. Place them at the physical table and keep the staff workspace authenticated. Add staff seating verification or rotating per-visit codes before using them where possession of a static QR is insufficient access control.
- Cash and bank transfer are recorded as pending requests until staff explicitly confirms receipt. No card/wallet gateway is configured, no bank transfer is verified automatically, and no funds move through this application.
- Cash/card refunds, automatic tax jurisdiction selection, payment processor reconciliation and production load testing remain separate integrations. Review your menu, allergens, tax settings and receipts before service.
- Configure RDS backups, monitoring, retention and a rollback policy for your deployment. Take a backup before schema changes.
