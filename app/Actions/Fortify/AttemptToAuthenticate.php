<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Actions\AttemptToAuthenticate as FortifyAttemptToAuthenticate;
use Laravel\Fortify\Fortify;

class AttemptToAuthenticate extends FortifyAttemptToAuthenticate
{
    /**
     * @param  Request  $request
     * @param  callable(Request): mixed  $next
     */
    public function handle(mixed $request, mixed $next): mixed
    {
        return parent::handle($request, function (Request $request) use ($next): mixed {
            $this->rejectSuspended($request);

            return $next($request);
        });
    }

    /**
     * @throws ValidationException
     */
    protected function rejectSuspended(Request $request): void
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
