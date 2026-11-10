FROM php:8.4-fpm-alpine AS base
RUN apk add --no-cache icu-libs libzip oniguruma nginx supervisor && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev libzip-dev oniguruma-dev && docker-php-ext-install pdo_mysql intl zip opcache mbstring && apk del .build-deps
WORKDIR /app
FROM base AS deps
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --no-interaction --no-progress --no-autoloader
COPY . .
RUN composer dump-autoload --optimize --no-dev --no-scripts && php artisan package:discover
FROM base AS runtime
RUN addgroup -g 1001 -S app && adduser -u 1001 -S -G app app && mkdir -p /run/nginx /var/lib/nginx/logs /var/log/supervisor
COPY --from=deps --chown=app:app /app /app
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-app.conf
RUN chown -R app:app /run/nginx /var/lib/nginx /var/log/nginx /var/log/supervisor /app/storage /app/bootstrap/cache
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O /dev/null http://127.0.0.1:8080/up || exit 1
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
