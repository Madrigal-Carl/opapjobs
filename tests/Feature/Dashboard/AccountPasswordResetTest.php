<?php

use App\Events\StaffAccountCreated;
use App\Listeners\SendStaffPasswordResetLink;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

test('the staff account created event sends a password reset link after commit', function () {
    Notification::fake();

    $staff = User::factory()->agency()->create();

    $listener = new SendStaffPasswordResetLink;

    expect($listener)->toBeInstanceOf(ShouldQueueAfterCommit::class);

    $listener->handle(new StaffAccountCreated($staff));

    Notification::assertSentTo($staff, ResetPassword::class);

    expect(DB::table('password_reset_tokens')->where('email', $staff->email)->exists())->toBeTrue();
});
