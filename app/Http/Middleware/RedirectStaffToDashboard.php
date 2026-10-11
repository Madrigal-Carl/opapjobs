<?php

namespace App\Http\Middleware;

use App\Enums\Permission;
use App\Support\RoleHome;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectStaffToDashboard
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->can(Permission::AccessDashboard->value)) {
            return redirect()->to(RoleHome::pathFor($user));
        }

        return $next($request);
    }
}
