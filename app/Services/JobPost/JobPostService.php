<?php

namespace App\Services\JobPost;

use App\Data\JobPost\JobPostDuplicateData;
use App\Data\JobPost\StoreJobPostData;
use App\Data\JobPost\UpdateJobPostData;
use App\Enums\ContractType;
use App\Enums\Currency;
use App\Enums\EducationLevel;
use App\Enums\GenderRequirement;
use App\Enums\JobPostStatus;
use App\Enums\Language;
use App\Enums\LanguageProficiency;
use App\Enums\QuestionAnswerType;
use App\Enums\RecruitmentType;
use App\Exceptions\JobPost\AgencyUnavailableException;
use App\Exceptions\JobPost\EmployerNotInAgencyException;
use App\Exceptions\JobPost\PathwayMismatchException;
use App\Models\Agency;
use App\Models\JobPost;
use App\Models\User;
use App\Repositories\AuditLogRepository;
use App\Repositories\JobPost\JobPostRepository;
use App\Services\AgencyService;
use App\Support\JobPostIndexFilters;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

class JobPostService
{
    public function __construct(private AgencyService $agencies, private JobPostRepository $posts, private AuditLogRepository $audit) {}

    public function create(User $user, StoreJobPostData $data): JobPost
    {
        $agency = $this->agencies->forPosting($user);
        $this->validateSelections($data, $agency);

        // Manpooling employers stay visible to staff; redact them in future applicant-facing responses.
        $post = $this->posts->create([
            ...$data->attributes, 'agency_id' => $agency->id, 'posted_by_user_id' => $user->id,
            'status' => JobPostStatus::Pending, 'is_urgent' => (bool) $data->attributes['is_urgent'],
        ]);
        $this->posts->syncLanguages($post, $data->languages);
        $this->posts->createQuestions($post, $data->questions);
        $this->audit->recordJobPostCreation($post, $data->ipAddress);

        return $post;
    }

    private function validateSelections(StoreJobPostData $data, Agency $agency): void
    {
        $subcategory = $this->posts->findSubcategoryWithCategory($data->attributes['job_subcategory_id']);
        if ($subcategory === null || $subcategory->category === null || $subcategory->category->trashed()
            || $subcategory->category->pathway !== $agency->pathway) {
            throw new PathwayMismatchException;
        }

        $employerId = $data->attributes['employer_id'];
        if ($employerId !== null && $this->posts->findEmployerForAgency($employerId, $agency->id) === null) {
            throw new EmployerNotInAgencyException;
        }

    }

    private function editablePost(User $user, int $id): JobPost
    {
        $post = $this->posts->findVisibleForUpdate($user, $id);
        abort_if($post->status === JobPostStatus::Archived, 403, __('Archived job posts cannot be changed.'));
        if ($post->agency->trashed() || $post->agency->suspended_at !== null) {
            throw new AgencyUnavailableException;
        }

        return $post;
    }

    /** @return array<string, mixed> */
    public function editFormData(User $user, int $id): array
    {
        $post = $this->editablePost($user, $id);

        return [...$this->formDataForAgency($post->agency), 'jobPost' => $this->posts->formValues($post)];
    }

    public function update(User $user, int $id, UpdateJobPostData $data): JobPost
    {
        $post = $this->editablePost($user, $id);
        $this->validateSelections($data, $post->agency);
        $this->posts->update($post, $data->attributes);
        $this->posts->syncLanguages($post, $data->languages);
        $this->posts->syncQuestions($post, $data->questions);
        $this->audit->recordJobPostChange($post, $user, 'updated', $data->ipAddress);

        return $post;
    }

    public function changeStatus(User $user, int $id, string $ipAddress, bool $archive): JobPostStatus
    {
        $post = $this->editablePost($user, $id);
        $this->posts->update($post, ['status' => $archive ? JobPostStatus::Archived : ($post->status === JobPostStatus::Closed ? JobPostStatus::Pending : JobPostStatus::Closed)]);
        $action = match ($post->status) {
            JobPostStatus::Archived => 'archived', JobPostStatus::Closed => 'closed', JobPostStatus::Pending => 'opened',
        };
        $this->audit->recordJobPostChange($post, $user, $action, $ipAddress);

        return $post->status;
    }

    /** @return array<string, mixed> */
    public function formData(User $user): array
    {
        return $this->formDataForAgency($this->agencies->forPosting($user));
    }

    /** @return array<string, mixed> */
    private function formDataForAgency(Agency $agency): array
    {

        return [
            'agency' => ['id' => $agency->id, 'name' => $agency->agency_name, 'pathway' => $agency->pathway->value],
            'categories' => $this->posts->categoriesForPathway($agency->pathway),
            'employers' => $this->posts->employersForAgency($agency->id),
            'today' => now(config('app.timezone'))->toDateString(),
            'options' => [
                'currencies' => array_column(Currency::cases(), 'value'),
                'contract_types' => array_column(ContractType::cases(), 'value'),
                'education_levels' => array_column(EducationLevel::cases(), 'value'),
                'languages' => array_column(Language::cases(), 'value'),
                'proficiencies' => array_column(LanguageProficiency::cases(), 'value'),
                'genders' => array_column(GenderRequirement::cases(), 'value'),
                'recruitment_types' => array_column(RecruitmentType::cases(), 'value'),
                'answer_types' => [QuestionAnswerType::Yesno->value, QuestionAnswerType::Short->value, QuestionAnswerType::Selection->value, QuestionAnswerType::Number->value],
            ],
        ];
    }

    /** @return array{posts: ?LengthAwarePaginator<int, JobPost>, kpis: ?array{active_jobs: int, total_applicants: int, with_job_order: int, successful_placements: int}} */
    public function list(User $user, JobPostIndexFilters $filters, bool $includePosts, bool $includeKpis): array
    {
        return [
            'posts' => $includePosts ? $this->posts->paginateForUser($user, $filters) : null,
            'kpis' => $includeKpis ? $this->posts->kpisForUser($user) : null,
        ];
    }

    /** @return list<array{id: int, job_title: string, created_at: ?string, display_status: string}> */
    public function duplicates(User $user, JobPostDuplicateData $data): array
    {
        $agency = $data->excludeId === null ? $this->agencies->forPosting($user) : $this->editablePost($user, $data->excludeId)->agency;

        return $this->posts->findDuplicates($user, $agency->id, $data->employerId, Str::lower(Str::squish($data->title)), $data->subcategoryId, $data->excludeId);
    }
}
