<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NFT extends Model
{
    protected $table = 'nfts';

    protected $fillable = [
        'nft_token_id',
        'issuer_address',
        'owner_address',
        'transaction_hash',
        'metadata_uri',
        'metadata',
        'taxon',
        'transfer_fee',
        'transferable',
        'burnable',
        'only_xrp',
        'status'
    ];

    protected $casts = [
        'metadata' => 'array',
        'transferable' => 'boolean',
        'burnable' => 'boolean',
        'only_xrp' => 'boolean',
        'taxon' => 'integer',
        'transfer_fee' => 'integer'
    ];

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(WalletUser::class, 'issuer_address', 'wallet_address');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(WalletUser::class, 'owner_address', 'wallet_address');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(NFTOffer::class, 'nft_token_id', 'nft_token_id');
    }

    public function activeOffers(): HasMany
    {
        return $this->offers()->where('status', 'active');
    }

    public function sellOffers(): HasMany
    {
        return $this->activeOffers()->where('type', 'sell');
    }

    public function buyOffers(): HasMany
    {
        return $this->activeOffers()->where('type', 'buy');
    }

    public function fetchMetadata()
    {
        if (!$this->metadata_uri) {
            return null;
        }

        try {
            $response = file_get_contents($this->metadata_uri);
            $metadata = json_decode($response, true);

            if ($metadata) {
                $this->update(['metadata' => $metadata]);
                return $metadata;
            }
        } catch (\Exception $e) {
            \Log::error('Failed to fetch NFT metadata: ' . $e->getMessage());
        }

        return null;
    }

    public function getLowestPrice()
    {
        $sellOffer = $this->sellOffers()->orderBy('amount')->first();
        return $sellOffer ? (int)$sellOffer->amount : null;
    }

    public function getHighestBid()
    {
        $buyOffer = $this->buyOffers()->orderByDesc('amount')->first();
        return $buyOffer ? (int)$buyOffer->amount : null;
    }

    public function getImageAttribute()
    {
        if ($this->metadata && isset($this->metadata['image'])) {
            return $this->metadata['image'];
        }

        return 'https://via.placeholder.com/400x400?text=NFT';
    }

    public function getNameAttribute()
    {
        if ($this->metadata && isset($this->metadata['name'])) {
            return $this->metadata['name'];
        }

        return 'Unnamed NFT';
    }

    public function getDescriptionAttribute()
    {
        if ($this->metadata && isset($this->metadata['description'])) {
            return $this->metadata['description'];
        }

        return 'No description available';
    }

    public function getAttributesAttribute()
    {
        if ($this->metadata && isset($this->metadata['attributes'])) {
            return $this->metadata['attributes'];
        }

        return [];
    }

    public function getTransferFeePercentAttribute()
    {
        return $this->transfer_fee ? ($this->transfer_fee / 1000) : 0;
    }

    public function isOwnedBy($walletAddress)
    {
        return $this->owner_address === $walletAddress;
    }

    public function isCreatedBy($walletAddress)
    {
        return $this->issuer_address === $walletAddress;
    }

    public function canBeTransferred()
    {
        return $this->transferable && $this->status === 'active';
    }

    public function canBeBurned($walletAddress)
    {
        return $this->burnable &&
            ($this->issuer_address === $walletAddress || $this->owner_address === $walletAddress) &&
            $this->status === 'active';
    }
}

