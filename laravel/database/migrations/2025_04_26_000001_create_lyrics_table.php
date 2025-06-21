<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateLyricsTable extends Migration
{
    public function up()
    {
        Schema::create('lyrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('song_id')->constrained()->onDelete('cascade');
            $table->text('content'); // LRC形式の歌詞データ
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('lyrics');
    }
}
