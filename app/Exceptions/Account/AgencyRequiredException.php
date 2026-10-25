<?php

namespace App\Exceptions\Account;

class AgencyRequiredException extends AccountException
{
    public function __construct()
    {
        parent::__construct('An agency is required to manage staff accounts.', null, 403);
    }
}
