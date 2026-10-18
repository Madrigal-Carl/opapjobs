<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\JobPost;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoAuditLogSeeder extends Seeder
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
            $events = [];
            $agencies = Agency::whereIn('slug', DemoAgencySeeder::SLUGS)->with('adminUser')->orderBy('id')->get();
            foreach ($agencies as $agency) {
                foreach ($agency->jobPosts()->orderBy('created_at')->get() as $index => $post) {
                    $created = CarbonImmutable::parse($post->created_at);
                    $status = $post->getRawOriginal('status');
                    $changes = [];
                    if ($status === 'closed' || $status === 'archived') {
                        $changes[] = [$status, 'pending', $status, CarbonImmutable::parse($post->updated_at), []];
                    } elseif ($index === 10) {
                        $oldClosing = $created->addDays(9)->toDateString();
                        $changes[] = ['closed', 'pending', 'closed', $created->addDays(7), ['closing_date' => [$oldClosing, $oldClosing]]];
                        $changes[] = ['reopened', 'closed', 'pending', $created->addDays(10), ['closing_date' => [$oldClosing, $post->closing_date->toDateString()]]];
                    } elseif ($index === 11) {
                        $changes[] = ['archived', 'pending', 'archived', $created->addDays(7), []];
                        $changes[] = ['restored', 'archived', 'pending', $created->addDays(10), []];
                    }
                    foreach ($changes as [$action, $before, $after, $at, $extra]) {
                        $payload = ['before' => ['status' => $before], 'after' => ['status' => $after]];
                        foreach ($extra as $column => [$previous, $next]) {
                            $payload['before'][$column] = $previous;
                            $payload['after'][$column] = $next;
                        }
                        $events[] = [
                            'actor_user_id' => $agency->admin_user_id, 'action' => $action,
                            'subject_type' => JobPost::class, 'subject_id' => $post->id,
                            'changes' => $payload, 'created_at' => $at,
                        ];
                    }
                }
                if ($agency->suspended_at !== null) {
                    $events[] = [
                        'actor_user_id' => $agency->created_by_user_id, 'action' => 'suspended',
                        'subject_type' => Agency::class, 'subject_id' => $agency->id,
                        'changes' => ['before' => ['suspended_at' => null], 'after' => ['suspended_at' => $agency->getRawOriginal('suspended_at')]],
                        'created_at' => $agency->suspended_at,
                    ];
                }
                foreach ($agency->staffUsers()->withTrashed()->get() as $staff) {
                    foreach (['suspended_at' => 'suspended', 'deleted_at' => 'archived'] as $column => $action) {
                        if ($staff->getAttribute($column) !== null) {
                            $events[] = [
                                'actor_user_id' => $agency->admin_user_id, 'action' => $action,
                                'subject_type' => User::class, 'subject_id' => $staff->id,
                                'changes' => ['before' => [$column => null], 'after' => [$column => $staff->getRawOriginal($column)]],
                                'created_at' => $staff->getAttribute($column),
                            ];
                        }
                    }
                }
            }

            foreach ($events as $index => $event) {
                $log = AuditLog::firstOrNew([
                    'subject_type' => $event['subject_type'], 'subject_id' => $event['subject_id'],
                    'action' => $event['action'],
                ]);
                $log->forceFill([...$event, 'ip_address' => '192.0.2.'.($index + 1)])->save();
            }
        });
    }
}
