# One free Render web service: nginx routes /api to Laravel and pages to Next.js.
FROM node:22-alpine AS frontend-deps
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM frontend-deps AS frontend-build
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SHARED_DEMO=true API_INTERNAL_URL=http://127.0.0.1:8080
RUN npm run build

FROM php:8.4-fpm-alpine AS php-base
RUN apk add --no-cache icu-libs libzip libpq oniguruma nginx supervisor nodejs \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev libzip-dev oniguruma-dev postgresql-dev \
    && docker-php-ext-install pdo_pgsql pdo_mysql intl zip opcache mbstring \
    && apk del .build-deps
WORKDIR /app

FROM php-base AS backend-build
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --no-interaction --no-progress --no-autoloader
COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev --no-scripts && php artisan package:discover

FROM php-base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=127.0.0.1 PORT=8080 NODE_OPTIONS=--max-old-space-size=192
RUN addgroup -g 1001 -S app && adduser -u 1001 -S -G app app \
    && mkdir -p /run/nginx /var/lib/nginx/logs /var/log/supervisor /frontend
COPY --from=backend-build --chown=app:app /app /app
COPY --from=frontend-build --chown=app:app /frontend/.next/standalone /frontend
COPY --from=frontend-build --chown=app:app /frontend/.next/static /frontend/.next/static
COPY --from=frontend-build --chown=app:app /frontend/public /frontend/public
COPY backend/docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-app.conf
COPY deploy/render-nginx.conf /etc/nginx/nginx.conf
COPY deploy/render-supervisord.conf /etc/supervisord.conf
COPY --chmod=755 deploy/render-start.sh /usr/local/bin/render-start
RUN chown -R app:app /run/nginx /var/lib/nginx /var/log/nginx /var/log/supervisor /app/storage /app/bootstrap/cache \
    && printf '\n[www]\npm = ondemand\npm.max_children = 3\npm.process_idle_timeout = 10s\npm.max_requests = 200\n' >> /usr/local/etc/php-fpm.d/zz-app.conf
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O /dev/null http://127.0.0.1:8080/up || exit 1
CMD ["render-start"]
