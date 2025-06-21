<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


class CreateAuthNoncesTable extends Migration
{
    public function up()
    {
        Schema::create('auth_nonces', function (Blueprint $table) {
            $table->id();
            $table->string('nonce', 64)->unique();
            $table->string('wallet_address');
            $table->timestamp('expires_at');
            $table->boolean('used')->default(false);
            $table->timestamps();

            $table->index(['wallet_address', 'used']);
            $table->index(['expires_at']);
            $table->index(['nonce']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('auth_nonces');
    }
}


