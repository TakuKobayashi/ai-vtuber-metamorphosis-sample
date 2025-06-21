<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
class CreateNftOffersTable extends Migration
{
    public function up()
    {
        Schema::create('nft_offers', function (Blueprint $table) {
            $table->id();
            $table->string('offer_id', 64)->unique();
            $table->string('nft_token_id', 64);
            $table->string('owner_address'); // NFTの所有者
            $table->string('offerer_address'); // オファーを作成した人
            $table->enum('type', ['sell', 'buy']);
            $table->string('amount'); // drops単位（文字列で保存）
            $table->string('destination_address')->nullable(); // 特定の相手への売却
            $table->string('transaction_hash');
            $table->enum('status', ['active', 'accepted', 'cancelled', 'expired'])->default('active');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['nft_token_id', 'status']);
            $table->index(['type', 'status']);
            $table->index(['offerer_address']);
            $table->index(['owner_address']);
            $table->index(['expires_at']);
            $table->index(['amount']);

            $table->foreign('nft_token_id')->references('nft_token_id')->on('nfts')->onDelete('cascade');
            $table->foreign('offerer_address')->references('wallet_address')->on('wallet_users')->onDelete('cascade');
            $table->foreign('owner_address')->references('wallet_address')->on('wallet_users')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('nft_offers');
    }
}

