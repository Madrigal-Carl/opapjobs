<?php

namespace App\Http\Controllers;

use App\Actions\Site\DeleteApplicantDocumentAction;
use App\Actions\Site\StoreApplicantDocumentsAction;
use App\Actions\Site\UpdateApplicantAvatarAction;
use App\Actions\Site\UpdateApplicantProfileAction;
use App\Http\Requests\Site\StoreApplicantDocumentsRequest;
use App\Http\Requests\Site\UpdateApplicantAvatarRequest;
use App\Http\Requests\Site\UpdateApplicantProfileRequest;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Saves the applicant's profile page: its sections, its files and the
 * photo. Files live on the private disk under the applicant's own folder.
 */
class ApplicantProfileController extends Controller
{
    public function update(UpdateApplicantProfileRequest $request, UpdateApplicantProfileAction $action): RedirectResponse
    {
        $action->execute($request->user(), $request->validated());

        Toast::success(__('Profile saved.'));

        return back();
    }

    public function storeDocuments(StoreApplicantDocumentsRequest $request, StoreApplicantDocumentsAction $action): RedirectResponse
    {
        $paths = [];

        try {
            $files = [];
            foreach ($request->file('documents') as $file) {
                $files[] = $this->store($file, 'applicants/'.$request->user()->id.'/documents');
                $paths[] = end($files)['storage_path'];
            }
            $action->execute($request->user(), $files);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($paths);

            throw $exception;
        }

        Toast::success(trans_choice('{1} File added to your profile.|[2,*] :count files added to your profile.', count($files)));

        return back();
    }

    public function destroyDocument(Request $request, int $document, DeleteApplicantDocumentAction $action): RedirectResponse
    {
        $unusedPath = $action->execute($request->user(), $document);

        if ($unusedPath !== null) {
            Storage::disk('local')->delete($unusedPath);
        }

        Toast::success(__('File removed from your profile.'));

        return back();
    }

    public function avatar(Request $request): StreamedResponse
    {
        $path = $request->user()->applicantProfile()->value('avatar_path');
        abort_if($path === null || ! Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, headers: ['Cache-Control' => 'private, max-age=86400']);
    }

    public function updateAvatar(UpdateApplicantAvatarRequest $request, UpdateApplicantAvatarAction $action): RedirectResponse
    {
        $path = $this->store($request->file('avatar'), 'applicants/'.$request->user()->id.'/avatar')['storage_path'];

        try {
            $previous = $action->execute($request->user(), $path);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);

            throw $exception;
        }

        if ($previous !== null) {
            Storage::disk('local')->delete($previous);
        }

        Toast::success(__('Profile photo updated.'));

        return back();
    }

    /** @return array{original_file_name: string, storage_path: string, mime_type: ?string, file_size_bytes: int} */
    private function store(UploadedFile $file, string $folder): array
    {
        $path = Storage::disk('local')->putFileAs($folder, $file->getPathname(), $file->hashName());
        if ($path === false) {
            throw new RuntimeException('Could not store the profile file.');
        }

        return [
            'original_file_name' => basename(str_replace('\\', '/', $file->getClientOriginalName())),
            'storage_path' => $path, 'mime_type' => $file->getMimeType(), 'file_size_bytes' => $file->getSize(),
        ];
    }
}
