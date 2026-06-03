# ai-vtuber-metamorphosis

ai-vtuber-metamorphosis は、Webブラウザ上で VRM アバターと VRMA モーションをランタイムに読み込み、動的に差し替えながら再生できるサンプルプロジェクトです。

アプリケーションへアバターを組み込むのではなく、アバターやモーションそのものをコンテンツとして扱い、ユーザーが自由に組み合わせて利用できることを目指しています。

本プロジェクトでは以下を実現しています。

* VRMアバターのランタイムロード
* VRMAモーションのランタイムロード
* モーション切り替え
* ブラウザのみで動作するアバターシステム
* Cloudflare上でのデプロイ
* AI VTuberやXRアプリケーションへの応用可能な構成

このプロジェクトは単なるVRMビューアーではなく、Web上でアバターを流通・活用するためのRuntime Avatar Platformの技術検証として開発されています。

## Why?

VRMは優れたアバター規格ですが、多くのアプリケーションでは事前に組み込まれたモデルを利用する前提になっています。

本プロジェクトでは、アバターやモーションをアプリケーションから分離し、Web上から動的に取得・再生できる仕組みを構築することで、よりオープンなアバターエコシステムの実現を目指しています。

将来的には以下のような用途を想定しています。

* AI VTuber
* AIアシスタント
* XRアプリケーション
* メタバース
* アバターショーケース
* VRMマーケットプレイス
* Webベースのキャラクタープラットフォーム

## デモサイト

デモサイトはこちらを参照してください

https://ai-vtuber-metamorphosis.taptappun.workers.dev/

## 使用した素材一覧

### 背景の3Dモデル

* [サイバーステージ](https://booth.pm/ja/items/3964661)
* [宮殿のようなステージ vr](https://booth.pm/ja/items/3278442)

### 使用した3Dモデル

* [ニコニ立体ちゃん特設サイト(アリシア・ソリッド)](https://3d.nicovideo.jp/alicia/)

### モーション

* [TikTok_ダンスモーション37_『刀ピークリスマスのテーマソング2023』](https://maronvtuber.booth.pm/items/5381212)
* [TikTok_ダンスモーション38_『デビルじゃないもん』](https://maronvtuber.booth.pm/items/5388478)
* [TikTok_ダンスモーション39_『愛包ダンスホール』](https://maronvtuber.booth.pm/items/5421682)
* [TikTok_ダンスモーション40_『Bling-Bang-Bang-Born』](https://maronvtuber.booth.pm/items/5480839)
* [TikTok_ダンスモーション41_『わんだふるぷりきゅあ！ / FUN☆FUN☆わんだふるDAYS!』](https://maronvtuber.booth.pm/items/5517361)
* [TikTok_ダンスモーション44_『しかのこのこのここしたんたん』](https://maronvtuber.booth.pm/items/5816852)
* [TikTok_ダンスモーション45_『うい麦畑でつかまえて』](https://maronvtuber.booth.pm/items/5846143)
* [TikTok_ダンスモーション47_『シカ色デイズ』](https://maronvtuber.booth.pm/items/5902241)
* [TikTok_ダンスモーション50_『魔眼ウインク』](https://maronvtuber.booth.pm/items/6047988)
* [TikTok_ダンスモーション53_『まいたけダンス』](https://maronvtuber.booth.pm/items/6134645)
* [TikTok_ダンスモーション54_『パイパイ仮面でどうかしらん？』](https://maronvtuber.booth.pm/items/6137596)
* [TikTok_ダンスモーション58_『テトリス』](https://maronvtuber.booth.pm/items/6438933)
* [TikTok_ダンスモーション59_『LADY CRAZY』](https://maronvtuber.booth.pm/items/6519236)
* [TikTok_ダンスモーション61_『ハッピーミルフィーユ』](https://maronvtuber.booth.pm/items/6589400)
* [TikTok_ダンスモーション63_『ひたむきシンデレラ』](https://maronvtuber.booth.pm/items/6681816)
* [TikTok_ダンスモーション64_『どきどきキュンで大暴走』](https://maronvtuber.booth.pm/items/6692560)
* [TikTok_ダンスモーション65_『LEMON MELON COOKIE』](https://maronvtuber.booth.pm/items/6728132)
* [TikTok_ダンスモーション67_『愛♡スクリ～ム！』](https://maronvtuber.booth.pm/items/6792349)
* [TikTok_ダンスモーション68_『キスキツネ』](https://maronvtuber.booth.pm/items/6820197)
* [VRMアニメーション7種セット](https://booth.pm/ja/items/5512385)
* [使いどころに困るモーションセット](https://booth.pm/ja/items/5527394)