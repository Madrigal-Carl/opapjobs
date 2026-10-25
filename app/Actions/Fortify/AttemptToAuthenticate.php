<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Actions\AttemptToAuthenticate as FortifyAttemptToAuthenticate;
use Laravel\Fortify\Fortify;

class AttemptToAuthenticate extends FortifyAttemptToAuthenticate
{
    public function handle($request, $next)
    {
        if (Fortify::$authenticateUsingCallback) {
            return $this->handleUsingCustomCallback($request, $next);
        }

        if ($this->guard->attempt($request->only(Fortify::username(), 'password'), $request->boolean('remember'))) {
            $this->rejectSuspended($request);

            return $next($request);
        }

        $this->throwFailedAuthenticationException($request);
    }

    protected function handleUsingCustomCallback($request, $next)
    {
        $user = call_user_func(Fortify::$authenticateUsingCallback, $request);

        if (! $user) {
            $this->fireFailedEvent($request);

            return $this->throwFailedAuthenticationException($request);
        }

        $this->guard->login($user, $request->boolean('remember'));

        return $next($request);
    }

    /**
     * @throws ValidationException
     */
    protected function rejectSuspended($request): void
    {
        $user = $this->guard->user();

        if (! $user instanceof User || $user->suspended_at === null) {
            return;
        }

        $this->guard->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        throw ValidationException::withMessages([
            Fortify::username() => [__('Your account has been suspended.')],
        ]);
    }
}
