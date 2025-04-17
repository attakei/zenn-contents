---
title: "Pipedreamで再びXにポスト出来るようにする"
emoji: "🤖"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["pipedream", "typescript", "twitterapi"]
published: false
---

Zennでの記事更新や自分のサイト更新などで、通知目的でSNSに発信するというのはよくやる手法です。
最近では、自分も下記の記事を書いて、XとBlueskyで発信しています。

https://zenn.dev/attakei/articles/compile-sphinx-revealjs-theme-3-2

https://x.com/attakei/status/1912490168201732268

https://bsky.app/profile/attakei.net/post/3lmwnbnoesi25
[^1]

[^1]: Blueskyでは「機械的な発信」と「雑談的な発信」でアカウントを分けていて、これは前者のアカウントで発信しています。

ところで、SNSへの発信をどのように行っているでしょうか？
様々な方法が選択肢に上がりますが、自分はPipedreamを利用して次のような方法を取っています。

1. RSSフィードを取得する。
2. フィード内の`pubDate`などを確認して、「通知対象があるか」を判定する。
3. 通知対象が会った場合、データ整形などをしたうえで、XとBlueskyに投稿する。

## そもそもPipedreamとは

https://pipedream.com/

各種サービス類を連携させて協調動作させるPaaSという感じのもので、大雑把に例えるなら「AWS Labmda付きIFTTT/Zapier」といったものです。

* 様々なプラットフォーム上での動作を【トリガー】として受け取れる基盤を持つ。
* 【トリガー】を起点に様々な動作を【アクション】として宣言して、【ワークフロー】として連携動作させる。
* 【トリガー】や【アクション】では様々なサービスを標準で実現可能ななか、自分でプログラムを載せることも可能。

もちろん、AWS LabmdaやGoogle Cloud Functionsなどに処理を実装してHTTP経由で呼び出せばIFTTTやZapierなどでも出来ることの幅は変わりません。
しかし、「デプロイ先自体がサービスに含まれている」という特性は個人的に性に合うのか、普段遣いしています。

なお、「カスタムアクションの作り方」については、Qiitaの方で簡単な解説をしています。

https://qiita.com/attakei/items/9c1c4b1a3cc73398f3bf

## Xの連携ができなくなった

今、Pipedreamでワークフローの構築などをしていこうとすると、とある問題にぶつかります。

以前はできていた **Xとの連携が提供されなくなりました。**

Xが青い鳥であるTwitterだった頃、Pipedreamでも当然ながらTwitter連携機能が標準で提供されていました。
使い始めた頃はもちろん使えた機能で、実際に2年ほど前にQiitaで記事を書いています。

https://qiita.com/attakei/items/1455e56634db57e479b9

現在では、アクションからXに関する候補は一切できなくなり、仮にポストを投稿したい場合は実質的に自作する必要が出てきます。

## X AppとX API

Xと連携するためのアプリケーション自体はXプラットフォームが提供しています。
現時点では無料プランでもポストの投稿自体は可能です。

アプリケーションの作成方法はちょっと省略しますが、作成すると次の情報が手に入ります。

* API Key
* API Key Secret
* Access Token
* Access Toke Secret

昔のTwitter APIであれば、この情報があればサードパーティーライブラリなどを使ってツイートの投稿が簡単にできました。
これは、APIのがいわゆるOAuth 1.0による認可に対応していたためです。

しかし、現行版であるX APIのポスト投稿はv2に相当しており、認可部分はOAuth 2のみに対応しています。
そのため、過去に使えた方式が使えません。

幸い、「捨てる神あれば拾う神あり」と言わんばかりに、似たような状況に対して解決策を確立している記事がZenn内に存在します。

https://zenn.dev/maretol/articles/163d2b82c9bb2d

## カスタムアクションにする

さて、前述の記事に書かれている内容は、PipedreamのNode.jsアクションとして直接実装したうえで動作することは確認できました。
しかし、これでは他のワークフローでの再利用性がちょっと低いです。

そこで、Pipedreamのカスタムアクションとして実装して、自分だけでなく自分以外の人でも使いやすいような実装をしました。

https://github.com/attakei-lab/pipedream-components

## 使い方

### アクションの登録

PipedreamのCLIをインストールしたうえで、次のような作業をするだけで使えるようになります。

```console
git clone https://github.com/attakei-lab/pipedream-components
cd pipedream-components
pnpm install
pnpm build
pd publish packages/components/dist/twitter/send-tweet.mjs

```

Pipedreamのアクション選択時に「My Actions」のフィルターを選択すると、自分が登録したアクションから`Twitter/Send tweet`を選べるようになります。

![](/images/pipedream-actions-x-tweet/select-actions.png)

## アクションの動作設定

アクションの動作設定では、現状だと次の2個を要求します。

![](/images/pipedream-actions-x-tweet/configure-action.png)

* `Credentials JSON text`: X Appの認証情報一式をJSON文字列にしたもの。 [^2] [^3]
  * 要素としては、`api_key`, `api_key_secret`, `access_key`, `access_key_secret`が含まれていること。
* `Tweet text`: 投稿本文。Xのポスト投稿時のフォームに入力するものと同じとみなして良い。

`Tweet text`の方はおそらく前述の通りの仕様のため、トリガーやアクションで作られた情報を組み立てて設定しておけばよいです。
例で貼った上記の画像は、自分が使っているワークフローの内容そのもので、「メッセージ+記事URL」という簡単な構成にしています。

X API側はこのあたりが柔軟なのか、ちゃんとメッセージだけがメッセージとして表示したうえで記事URLはOpen Graphプロトコルで取得できる画像+リンクになっています。

[^2]: Pipedreamの環境変数設定を使ってsecretな管理をすることを推奨します。
[^3]: 4項目をバラバラに設定しても良かったけど、どう考えても不可分なので楽したい方に倒しています。

## 中身を見たい人向け

先ほどはリポジトリのリンクを貼りましたが、コードだけを見ればよいのなら、こちらを参照してください。

https://github.com/attakei-lab/pipedream-components/blob/main/packages/components/src/twitter/send-tweet.mts

参考にした記事と基本的な実装自体はほとんど同じです。
署名を作成する箇所や署名をもとにAuthorizationヘッダーを構築するところあたりは特に同じと言ってよいです。

## 今後やれると良いこと

今回の実装は「単純メッセージのみ」の投稿でした。
自分の中で需要がありそうなら、画像や動画が付属しているポストぐらいまでは実現したいところです。

