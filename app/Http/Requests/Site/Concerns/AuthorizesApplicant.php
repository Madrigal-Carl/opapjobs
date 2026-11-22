<?php

namespace App\Http\Requests\Site\Concerns;

use App\Enums\Permission;

/**
 * Applicant-only writes: the user reads agency profiles but has no
 * dashboard, which is exactly the applicant role.
 */
trait AuthorizesApplicant
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ViewAgencyProfile->value)
            && ! $this->user()->can(Permission::AccessDashboard->value);
    }
}
