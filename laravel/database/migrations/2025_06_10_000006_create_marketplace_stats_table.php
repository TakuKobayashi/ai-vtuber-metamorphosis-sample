<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMarketplaceStatsTable extends Migration
{
    public function up()
    {
        Schema::create('marketplace_stats', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->unsignedInteger('total_nfts')->default(0);
            $table->unsignedInteger('total_offers')->default(0);
            $table->unsignedInteger('active_sell_offers')->default(0);
            $table->unsignedInteger('active_buy_offers')->default(0);
            $table->string('total_volume')->default('0'); // drops
            $table->string('average_price')->default('0'); // drops
            $table->unsignedInteger('daily_transactions')->default(0);
            $table->unsignedInteger('new_users')->default(0);
            $table->timestamps();

            $table->unique('date');
            $table->index(['date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('marketplace_stats');
    }
}
