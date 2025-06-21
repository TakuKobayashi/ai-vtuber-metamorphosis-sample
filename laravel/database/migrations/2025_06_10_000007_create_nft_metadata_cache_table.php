<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
class CreateNftMetadataCacheTable extends Migration
{
    public function up()
    {
        Schema::create('nft_metadata_cache', function (Blueprint $table) {
            $table->id();
            $table->string('nft_token_id', 64)->unique();
            $table->text('metadata_uri');
            $table->json('metadata');
            $table->timestamp('cached_at');
            $table->timestamp('expires_at')->nullable();
            $table->boolean('fetch_failed')->default(false);
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['nft_token_id']);
            $table->index(['expires_at']);
            $table->index(['cached_at']);

            $table->foreign('nft_token_id')->references('nft_token_id')->on('nfts')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('nft_metadata_cache');
    }
}

