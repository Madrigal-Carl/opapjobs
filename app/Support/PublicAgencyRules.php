<?php

namespace App\Support;

/**
 * Fixed numbers behind the applicant-side agency and job post pages. They are
 * sent to the client as props where the UI needs them, so the two sides
 * cannot disagree.
 */
final class PublicAgencyRules
{
    /** An agency is a Top Hirer when it ranks within this many of its pathway and has hired at least one applicant. */
    public const TOP_HIRER_RANK_LIMIT = 5;

    public const AGENCIES_PER_PAGE = 12;

    public const HOME_AGENCIES_PER_PATHWAY = 3;

    public const HOME_TOP_HIRERS_PER_PATHWAY = 3;

    public const HOME_JOBS_PER_PATHWAY = 6;

    public const JOBS_PER_BATCH = 10;

    /** A job post counts as "recent" when it was created within this many days. */
    public const RECENT_DAYS = 7;

    public const KEYWORD_MAX_LENGTH = 100;

    public const AGENCY_PROFILE_JOBS_LIMIT = 20;

    public const REVIEWS_PER_PAGE = 5;

    public const OTHER_JOBS_FROM_AGENCY_LIMIT = 4;

    public const RELATED_JOBS_LIMIT = 3;
}
