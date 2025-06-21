<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class NFTOffer extends Model
{
    protected $table = 'nft_offers';

    protected $fillable = [
        'offer_id',
        'nft_token_id',
        'owner_address',
        'offerer_address',
        'type',
        'amount',
        'destination_address',
        'transaction_hash',
        'status',
        'expires_at'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'amount' => 'string'
    ];

    public function nft(): BelongsTo
    {
        return $this->belongsTo(NFT::class, 'nft_token_id', 'nft_token_id');
    }

    public function offerer(): BelongsTo
    {
        return $this->belongsTo(WalletUser::class, 'offerer_address', 'wallet_address');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(WalletUser::class, 'owner_address', 'wallet_address');
    }

    public function getAmountInXRP()
    {
        return (int)$this->amount / 1000000;
    }

    public function getFormattedAmountAttribute()
    {
        return number_format($this->getAmountInXRP(), 6) . ' XRP';
    }

    public function isActive()
    {
        if ($this->status !== 'active') {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            $this->update(['status' => 'expired']);
            return false;
        }

        return true;
    }

    public function isExpired()
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function getRemainingTimeAttribute()
    {
        if (!$this->expires_at || $this->isExpired()) {
            return null;
        }

        return $this->expires_at->diffForHumans();
    }

    public function canBeAcceptedBy($walletAddress)
    {
        if (!$this->isActive()) {
            return false;
        }

        if ($this->type === 'sell') {
            // 売却オファーは、指定された相手または誰でも受諾可能
            return !$this->destination_address || $this->destination_address === $walletAddress;
        } else {
            // 購入オファーは、NFTの所有者のみが受諾可能
            return $this->owner_address === $walletAddress;
        }
    }

    public function getTypeDisplayAttribute()
    {
        return $this->type === 'sell' ? '売却' : '購入';
    }

    public function getStatusDisplayAttribute()
    {
        $statuses = [
            'active' => 'アクティブ',
            'accepted' => '受諾済み',
            'cancelled' => 'キャンセル',
            'expired' => '期限切れ'
        ];

        return $statuses[$this->status] ?? $this->status;
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', Carbon::now());
            });
    }

    public function scopeSellOffers($query)
    {
        return $query->where('type', 'sell');
    }

    public function scopeBuyOffers($query)
    {
        return $query->where('type', 'buy');
    }

    public function scopeForNFT($query, $nftTokenId)
    {
        return $query->where('nft_token_id', $nftTokenId);
    }

    public function scopeByOfferer($query, $walletAddress)
    {
        return $query->where('offerer_address', $walletAddress);
    }
}

