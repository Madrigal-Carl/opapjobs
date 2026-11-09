<?php

namespace App\Data\JobPost;

/**
 * @phpstan-type Attributes array{recruitment_type: string, job_order_number: ?string, required_documents: list<string>, employer_id: ?int, job_title: string, job_subcategory_id: int, work_location: string, vacant_positions: int, contract_type: string, salary_currency: ?string, monthly_salary_min: int|float|string|null, monthly_salary_max: int|float|string|null, education_level: string, min_experience_years: ?int, max_experience_years: ?int, gender_requirement: string, job_description: string, other_requirements: ?string, application_instructions: ?string, contact_person_name: ?string, contact_email: ?string, contact_phone: ?string, closing_date: ?string, is_urgent: bool}
 * @phpstan-type LanguageData array{language: string, proficiency: string}
 * @phpstan-type QuestionData array{id?: int, question_text: string, answer_type: string, expected_answer: ?string, options: list<string>, is_required: bool}
 */
readonly class StoreJobPostData
{
    /**
     * @param  Attributes  $attributes
     * @param  list<LanguageData>  $languages
     * @param  list<QuestionData>  $questions
     */
    public function __construct(public array $attributes, public array $languages, public array $questions, public string $ipAddress) {}
}
