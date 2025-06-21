<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WalletUser extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'wallet_address',
        'username',
        'email',
        'avatar_url',
        'profile_data',
        'last_login_at',
        'is_active'
    ];

    protected $casts = [
        'profile_data' => 'array',
        'last_login_at' => 'datetime',
        'is_active' => 'boolean'
    ];

    protected $hidden = ['created_at', 'updated_at'];

    public function nfts(): HasMany
    {
        return $this->hasMany(NFT::class, 'owner_address', 'wallet_address');
    }

    public function createdNfts(): HasMany
    {
        return $this->hasMany(NFT::class, 'issuer_address', 'wallet_address');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(NFTOffer::class, 'offerer_address', 'wallet_address');
    }

    public function getDisplayNameAttribute()
    {
        return $this->username ?: substr($this->wallet_address, 0, 6) . '...' . substr($this->wallet_address, -4);
    }

    public function getAvatarAttribute()
    {
        return $this->avatar_url ?: 'https://ui-avatars.com/api/?name=' . urlencode($this->display_name) . '&background=3B82F6&color=fff';
    }

    public function isVerified()
    {
        return $this->email_verified_at !== null;
    }

    public function getProfileCompletionAttribute()
    {
        $completion = 0;
        $totalFields = 5;

        if ($this->username) $completion++;
        if ($this->email) $completion++;
        if ($this->avatar_url) $completion++;
        if ($this->profile_data && count($this->profile_data) > 0) $completion++;
        if ($this->wallet_address) $completion++;

        return round(($completion / $totalFields) * 100);
    }
}

