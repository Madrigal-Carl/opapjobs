<?php

namespace App\Exceptions\Account;

class DuplicateAccountEmailException extends AccountException
{
    public function __construct()
    {
        parent::__construct('This email is already registered.', 'email');
    }
}
