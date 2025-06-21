<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class AuthNonce extends Model
{
    protected $fillable = [
        'nonce',
        'wallet_address',
        'expires_at',
        'used'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used' => 'boolean'
    ];

    public function isValid()
    {
        return !$this->used && $this->expires_at->isFuture();
    }

    public function markAsUsed()
    {
        $this->update(['used' => true]);
    }

    public function isExpired()
    {
        return $this->expires_at->isPast();
    }

    public function getRemainingTimeAttribute()
    {
        if ($this->isExpired()) {
            return 0;
        }

        return $this->expires_at->diffInSeconds(Carbon::now());
    }
}
