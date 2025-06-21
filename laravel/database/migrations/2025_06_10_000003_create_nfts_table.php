<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
class CreateNftsTable extends Migration
{
    public function up()
    {
        Schema::create('nfts', function (Blueprint $table) {
            $table->id();
            $table->string('nft_token_id', 64)->unique();
            $table->string('issuer_address');
            $table->string('owner_address');
            $table->string('transaction_hash');
            $table->text('metadata_uri')->nullable();
            $table->json('metadata')->nullable();
            $table->unsignedInteger('taxon')->default(0);
            $table->unsignedInteger('transfer_fee')->default(0); // 1/100000 units
            $table->boolean('transferable')->default(true);
            $table->boolean('burnable')->default(false);
            $table->boolean('only_xrp')->default(false);
            $table->enum('status', ['active', 'burned', 'transferred'])->default('active');
            $table->timestamps();

            $table->index(['owner_address', 'status']);
            $table->index(['issuer_address']);
            $table->index(['status']);
            $table->index(['taxon']);
            $table->index(['created_at']);

            $table->foreign('issuer_address')->references('wallet_address')->on('wallet_users')->onDelete('cascade');
            $table->foreign('owner_address')->references('wallet_address')->on('wallet_users')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('nfts');
    }
}

