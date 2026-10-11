<?php

namespace App\Http\Middleware;

use App\Enums\Permission;
use App\Support\RoleHome;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCanAccessDashboard
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->can(Permission::AccessDashboard->value)) {
            return $next($request);
        }

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            abort(403);
        }

        return redirect()->to(RoleHome::pathFor($request->user()));
    }
}
