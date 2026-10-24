<?php

namespace App\Models;

use App\Enums\DocumentType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property DocumentType $document_type
 * @property Carbon $uploaded_at
 */
class ApplicantDocument extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'applicant_user_id', 'document_type', 'original_file_name', 'storage_path',
        'mime_type', 'file_size_bytes', 'is_primary', 'uploaded_at',
    ];

    protected function casts(): array
    {
        return [
            'document_type' => DocumentType::class,
            'file_size_bytes' => 'integer',
            'is_primary' => 'boolean',
            'uploaded_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applicant_user_id')->withTrashed();
    }

    /** @return HasMany<Application, $this> */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'resume_document_id');
    }
}
