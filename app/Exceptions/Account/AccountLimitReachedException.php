<?php

namespace App\Exceptions\Account;

class AccountLimitReachedException extends AccountException
{
    public function __construct()
    {
        parent::__construct('You have reached the staff seat limit for this agency.');
    }
}
