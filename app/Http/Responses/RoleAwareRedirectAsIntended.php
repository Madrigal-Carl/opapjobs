<?php

namespace App\Http\Responses;

use App\Support\RoleHome;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleAwareRedirectAsIntended implements Responsable
{
    /**
     * Create a new class instance.
     */
    public function __construct(public string $name)
    {
        //
    }

    /**
     * Create an HTTP response that represents the object.
     *
     * @param  Request  $request
     * @return Response
     */
    public function toResponse($request)
    {
        return redirect()->intended(RoleHome::pathFor($request->user()));
    }
}
