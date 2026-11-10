<?php

namespace App\Http\Controllers;

use App\Actions\Site\SubmitJobApplicationAction;
use App\Http\Requests\Site\SubmitJobApplicationRequest;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class ApplicantApplicationController extends Controller
{
    public function store(SubmitJobApplicationRequest $request, int $job, SubmitJobApplicationAction $action): RedirectResponse
    {
        $paths = [];
        $submitted = false;

        try {
            $data = $request->safe()->except(['resume', 'documents']);
            $uploads = [];
            if ($file = $request->file('resume')) {
                $uploads['resume'] = $file;
            }
            foreach ($request->validated('documents', []) as $index => $document) {
                $data['documents'][$index]['name'] = $document['name'];
                $uploads["documents.{$index}.file"] = $request->file("documents.{$index}.file");
            }
            foreach ($uploads as $key => $file) {
                $path = Storage::disk('local')->putFileAs(
                    'applicants/'.$request->user()->id.'/applications', $file->getPathname(), $file->hashName(),
                );
                if ($path === false) {
                    throw new RuntimeException('Could not store the application file.');
                }
                $paths[] = $path;
                data_set($data, $key, [
                    'original_file_name' => basename(str_replace('\\', '/', $file->getClientOriginalName())),
                    'storage_path' => $path, 'mime_type' => $file->getMimeType(), 'file_size_bytes' => $file->getSize(),
                ]);
            }
            $application = $action->execute($request->user(), $job, $data);
            $submitted = true;
        } catch (ValidationException|HttpExceptionInterface $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors(['application' => __('Your application was not submitted. Please try again.')]);
        } finally {
            if (! $submitted && $paths !== []) {
                Storage::disk('local')->delete($paths);
            }
        }

        Toast::success(__('Application submitted.'));

        return to_route('jobs.apply', $job)->with('submitted_application_id', $application->id);
    }
}
