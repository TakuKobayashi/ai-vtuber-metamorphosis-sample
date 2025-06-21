<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWalletUsersTable extends Migration
{
    public function up()
    {
        Schema::create('wallet_users', function (Blueprint $table) {
            $table->id();
            $table->string('wallet_address')->unique();
            $table->string('username')->nullable()->unique();
            $table->string('email')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->text('avatar_url')->nullable();
            $table->json('profile_data')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['wallet_address']);
            $table->index(['username']);
            $table->index(['is_active']);
            $table->index(['last_login_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('wallet_users');
    }
}
