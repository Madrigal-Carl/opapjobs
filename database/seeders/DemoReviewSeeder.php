<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\AgencyReview;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoReviewSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        DB::transaction(function (): void {
            $agencies = Agency::whereIn('slug', DemoAgencySeeder::SLUGS)->get()->keyBy('id');
            $pairs = DB::table('applications')->join('job_posts', 'job_posts.id', '=', 'applications.job_post_id')
                ->whereIn('job_posts.agency_id', $agencies->keys())
                ->selectRaw('job_posts.agency_id, applications.applicant_user_id, MIN(applications.submitted_at) AS first_applied')
                ->groupBy('job_posts.agency_id', 'applications.applicant_user_id')
                ->orderBy('job_posts.agency_id')->orderBy('applications.applicant_user_id')->get();
            $texts = [
                'The coordinator explained the document checklist clearly and gave me a named contact for questions. I could prepare my application without repeated trips to the office.',
                'Salary details and the destination requirements were explained before I submitted my papers. I appreciated being able to ask questions without feeling rushed.',
                'The instructions were practical and the staff acknowledged receipt of my resume. Written updates helped me keep track of the next documents to prepare.',
                'Communication was respectful and the agency explained how credentials would be verified. The process felt organized even while I was waiting for the next update.',
                'The checklist was useful, although one response took longer than I expected. A clearer estimate of the waiting time would make the process easier.',
                'I received a clear explanation of the selection process and the staff answered my questions about the contract briefing. The written reminders were helpful.',
                'The agency contact was patient when I needed help organizing my credentials. I knew where to send the documents and how to follow up on my application.',
                'I had to follow up more than once for an update. The staff eventually clarified the next step, but more regular communication would help applicants plan their time.',
                'The recruitment team provided consistent information about document verification and interview preparation. I appreciated having the important instructions in writing.',
                'The coordinator checked that I understood the requirements rather than asking me to submit everything again. That made the application process much less confusing.',
                'The office explained the work location and salary range in a straightforward way. I was able to prepare relevant questions before the selection activity.',
                'Scheduling information changed and I did not receive a prompt explanation. I would like the agency to confirm changes in writing so applicants do not lose time.',
            ];
            $ratings = [5, 4, 5, 4, 3, 5, 4, 2, 5, 4, 5, 1];
            $archived = 0;
            $suspendedReviews = 0;

            foreach ($pairs as $index => $pair) {
                $agency = $agencies[$pair->agency_id];
                if ($index % 3 === 2 || ($agency->suspended_at !== null && $suspendedReviews >= 2)) {
                    continue;
                }
                if ($agency->suspended_at !== null) {
                    $suspendedReviews++;
                }
                $created = CarbonImmutable::parse($pair->first_applied)->addDays(7);
                if ($archived < 2 && $agency->suspended_at === null) {
                    $old = AgencyReview::withTrashed()->whereNotNull('deleted_at')->firstOrNew([
                        'agency_id' => $pair->agency_id, 'applicant_user_id' => $pair->applicant_user_id,
                    ]);
                    $old->forceFill([
                        'rating' => 2, 'review_text' => 'I was initially unsure whom to contact for an update and removed this review while the agency addressed my questions.',
                        'created_at' => $created, 'deleted_at' => $created->addDays(2), 'updated_at' => $created->addDays(2),
                    ])->save();
                    $archived++;
                    if ($archived === 2) {
                        continue;
                    }
                    $created = $created->addDays(3);
                }
                $review = AgencyReview::firstOrNew([
                    'agency_id' => $pair->agency_id, 'applicant_user_id' => $pair->applicant_user_id,
                ]);
                $review->forceFill([
                    'rating' => $ratings[intdiv($index, 2) % 12], 'review_text' => $texts[intdiv($index, 2) % 12],
                    'deleted_at' => null, 'created_at' => $created, 'updated_at' => $created,
                ])->save();
            }
        });
    }
}
