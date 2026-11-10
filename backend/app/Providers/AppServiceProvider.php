<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        RateLimiter::for('guest-read', fn (Request $r) => Limit::perMinute(120)->by('read:'.hash('sha256', $r->header('X-Guest-Token', $r->ip()))));
        RateLimiter::for('guest-action', fn (Request $r) => Limit::perMinute(10)->by('action:'.$r->route()->uri().':'.hash('sha256', $r->header('X-Guest-Token', $r->ip()))));
        RateLimiter::for('menu-read', fn (Request $r) => Limit::perMinute(240)->by('menu:'.$r->route('token')));
        RateLimiter::for('table-open', fn (Request $r) => Limit::perMinute(20)->by('open:'.$r->route('token')));
        RateLimiter::for('staff-login', fn (Request $r) => Limit::perMinute(5)->by('login:'.strtolower((string) $r->input('email')).':'.$r->ip()));
    }
}
