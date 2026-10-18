<?php

use App\Http\Middleware\RoleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['role' => RoleMiddleware::class]);
        $middleware->validateCsrfTokens(except: ['payments/midtrans/notification']);
        $middleware->redirectGuestsTo('/login');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash(['current_password', 'password', 'password_confirmation', 'code', 'token']);
        $exceptions->shouldRenderJsonWhen(fn (Request $r) => $r->is('payments/midtrans/notification') || $r->expectsJson());
    })->create();
