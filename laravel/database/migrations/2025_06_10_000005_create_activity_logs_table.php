<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateActivityLogsTable extends Migration
{
    public function up()
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('wallet_address');
            $table->string('activity_type'); // login, nft_mint, offer_create, etc.
            $table->string('description');
            $table->json('metadata')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['wallet_address', 'created_at']);
            $table->index(['activity_type']);
            $table->index(['created_at']);

            $table->foreign('wallet_address')->references('wallet_address')->on('wallet_users')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('activity_logs');
    }
}


