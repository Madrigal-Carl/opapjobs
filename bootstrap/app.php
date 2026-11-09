<?php

use App\Exceptions\Account\AccountException;
use App\Exceptions\JobPost\JobPostException;
use App\Http\Middleware\CheckUserSuspended;
use App\Http\Middleware\EnsureCanAccessDashboard;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectStaffToDashboard;
use App\Support\RoleHome;
use App\Support\Toast;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            CheckUserSuspended::class,
        ]);

        $middleware->alias([
            'dashboard.access' => EnsureCanAccessDashboard::class,
            'redirect.staff' => RedirectStaffToDashboard::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);

        $middleware->redirectUsersTo(
            fn (Request $request) => RoleHome::pathFor($request->user()),
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $isJobForm = fn (Request $request): bool => $request->routeIs(
            'dashboard.jobs.create', 'dashboard.jobs.store', 'dashboard.jobs.edit', 'dashboard.jobs.update',
            'dashboard.jobs.status', 'dashboard.jobs.archive', 'dashboard.jobs.duplicates', 'dashboard.employers.store',
        );

        $exceptions->render(function (AccountException $exception, Request $request) {
            if (! $request->routeIs('dashboard.accounts*')) {
                return null;
            }

            Toast::error($exception->status === 422 && $exception->field ? __('Please fix the highlighted fields.') : $exception->getMessage());

            if ($exception->status === 403) {
                if ($request->expectsJson()) {
                    return response()->json(['message' => $exception->getMessage()], 403);
                }

                return back()->withErrors(['error' => $exception->getMessage()])->setStatusCode(403);
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => $exception->getMessage(),
                    'errors' => $exception->field ? [$exception->field => [$exception->getMessage()]] : [],
                ], $exception->status);
            }

            return back()
                ->withErrors($exception->field ? [$exception->field => $exception->getMessage()] : [])
                ->withInput();
        });

        $exceptions->render(function (JobPostException $exception, Request $request) use ($isJobForm) {
            if (! $isJobForm($request)) {
                return null;
            }
            Toast::error($exception->getMessage());
            if ($exception->status === 403) {
                if ($request->isMethod('GET') && ! $request->expectsJson()) {
                    return Inertia::render('dashboard/jobs/unavailable', ['message' => $exception->getMessage()])
                        ->toResponse($request)->setStatusCode(403);
                }

                return response()->json(['message' => $exception->getMessage(), 'toast' => [
                    'type' => 'error', 'message' => $exception->getMessage(),
                ]], 403);
            }
            if ($request->expectsJson()) {
                return response()->json(['message' => $exception->getMessage(), 'toast' => [
                    'type' => 'error', 'message' => $exception->getMessage(),
                ]], $exception->status);
            }

            return back()->withErrors([$exception->field ?? 'job_post' => $exception->getMessage()])->withInput();
        });

        $exceptions->render(function (Throwable $exception, Request $request) use ($isJobForm) {
            if ($request->routeIs('dashboard.accounts*') && ! ($exception instanceof ValidationException
                || $exception instanceof AuthenticationException || $exception instanceof AccountException)) {
                if ($exception instanceof HttpExceptionInterface || $exception instanceof AuthorizationException) {
                    $status = $exception instanceof AuthorizationException ? 403 : $exception->getStatusCode();
                    if ($status === 403) {
                        Toast::error(__('Something went wrong. The staff account was not saved.'));

                        if ($request->expectsJson()) {
                            return response()->json(['message' => __('Something went wrong. The staff account was not saved.')], 403);
                        }

                        return back()->with('toast', ['type' => 'error', 'title' => __('Error'), 'message' => __('Something went wrong. The staff account was not saved.')])->setStatusCode(403);
                    }

                    return null;
                }
                $message = $request->routeIs('dashboard.accounts.archive')
                    ? __('Something went wrong. The staff account was not removed. Please try again.')
                    : __('Something went wrong. The staff account was not saved.');
                Toast::error($message);
                if ($request->expectsJson()) {
                    return response()->json(['message' => $message], 500);
                }
                if ($request->routeIs('dashboard.accounts.archive')) {
                    return back()->withErrors(['account' => $message]);
                }

                return back()->with('toast', ['type' => 'error', 'title' => __('Error'), 'message' => $message]);
            }

            if (! $isJobForm($request) || $exception instanceof ValidationException
                || $exception instanceof AuthenticationException || $exception instanceof JobPostException) {
                return null;
            }
            if ($exception instanceof HttpExceptionInterface || $exception instanceof AuthorizationException) {
                $status = $exception instanceof AuthorizationException ? 403 : $exception->getStatusCode();
                if ($status !== 403) {
                    return null;
                }
                $message = __('You do not have permission to manage job posts.');
            } else {
                $status = 500;
                $message = $request->routeIs('dashboard.employers.store')
                    ? __('Something went wrong. The employer was not added. Please try again.')
                    : ($request->routeIs('dashboard.jobs.store', 'dashboard.jobs.create', 'dashboard.jobs.duplicates')
                        ? __('Something went wrong. Your job post was not published. Please try again.')
                        : __('Something went wrong. Your job post was not changed. Please try again.'));
            }
            Toast::error($message);
            if ($status === 403 && $request->isMethod('GET') && ! $request->expectsJson()) {
                return Inertia::render('dashboard/jobs/unavailable', ['message' => $message])
                    ->toResponse($request)->setStatusCode(403);
            }
            if ($status === 403 || $request->expectsJson()) {
                return response()->json(['message' => $message, 'toast' => ['type' => 'error', 'message' => $message]], $status);
            }

            return back()->withErrors(['job_post' => $message])->withInput();
        });

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
