<?php

namespace Tests\Support;

use App\Models\JobCategory;
use App\Models\JobSubcategory;
use App\Models\User;

class JobPostInput
{
    /** @return array<string, mixed> */
    public static function for(User $user): array
    {
        $subcategory = JobSubcategory::factory()->for(JobCategory::factory()->state([
            'pathway' => $user->agency->pathway,
        ]), 'category')->create();

        return [
            'recruitment_type' => 'joborder', 'employer_id' => null,
            'job_title' => 'Electrician', 'job_subcategory_id' => $subcategory->id,
            'work_location' => 'Riyadh, Saudi Arabia', 'vacant_positions' => 3,
            'contract_type' => 'fixed', 'salary_currency' => 'SAR',
            'monthly_salary_min' => 2500, 'monthly_salary_max' => 3200,
            'education_level' => 'vocational', 'min_experience_years' => 0,
            'max_experience_years' => 5, 'gender_requirement' => 'any',
            'job_description' => '**Install** and maintain electrical systems.',
            'other_requirements' => 'Bring your **NC II** certificate.',
            'application_instructions' => 'Apply through your account.',
            'contact_person_name' => 'Recruitment team', 'contact_email' => 'hiring@example.test',
            'contact_phone' => null, 'closing_date' => null, 'is_urgent' => true,
            'languages' => [['language' => 'english', 'proficiency' => 'fluent']],
            'questions' => [],
        ];
    }

    /** @return list<array{question_text: string, answer_type: string, expected_answer: string, is_required: bool, sort_order: int}> */
    public static function questions(int $count): array
    {
        return array_map(fn (int $index): array => [
            'question_text' => '  Question '.($index + 1).'  ', 'answer_type' => 'yesno',
            'expected_answer' => 'yes', 'is_required' => $index % 2 === 0, 'sort_order' => 99,
        ], range(0, $count - 1));
    }
}
