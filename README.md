# utaone

composer  
https://github.com/qwen-php/qwen-php-client
https://webty.jp/staffblog/production/post-5806/

phpmyadmin  
https://uta.one/phpmyadmin/


Token iDollar v0
https://solscan.io/token/HBzna59igv24SnDi1hSYhefXzPJqAG7uTWqQjVtJ5gao

Token                                         Balance  
-----------------------------------------------------  
HBzna59igv24SnDi1hSYhefXzPJqAG7uTWqQjVtJ5gao  1000000  

Token iDollar v1
https://solscan.io/token/D1Mz2efJKeiDx5qKtmgEVMkMJmNqquEJj7KKogKvpump


# Web 側のdeploy

Webの確認用としてNetlifyにdeployしております。以下のURLにアクセスして確認することができます  
https://680fc1e5d8cf92705a79c508--utaone-web.netlify.app/  

## Deploy方法の確認

以下のコマンドを順に実行していくことでdeployすることができます

### Netlifyへのログイン

```
yarn run netlify login
```

### HTMLとして吐き出す

NextJSをBuildすることでHTMLとして吐き出すことができます

```
yarn run build
```

以下のコマンドでもBuildは行われます

```
yarn run netlify build
```

吐き出される先は `out/` になります

### Netlifyへdeployする

Netlifyにログイン済みの状態で以下のコマンドを実行することでNetlifyへとデプロイすることができます

```
yarn run netlify deploy
```

ここでdeployするディレクトリ名を聞かれますが、上記の `out/` を指定するようにしてください

# 使用した素材一覧

## 背景の3Dモデル

* [サイバーステージ](https://booth.pm/ja/items/3964661)
* [宮殿のようなステージ vr](https://booth.pm/ja/items/3278442)

## 使用した3Dモデル

* [ニコニ立体ちゃん特設サイト(アリシア・ソリッド)](https://3d.nicovideo.jp/alicia/)
* [Trump](https://hub.vroid.com/characters/3547853295237135862/models/2042307146559450438)

## モーション

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