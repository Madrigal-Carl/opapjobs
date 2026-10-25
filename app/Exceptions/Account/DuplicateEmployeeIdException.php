<?php

namespace App\Exceptions\Account;

class DuplicateEmployeeIdException extends AccountException
{
    public function __construct()
    {
        parent::__construct('This employee ID is already in use.', 'employee_id');
    }
}
