---
title: "PipedreamにおけるBlueskyへのリンクカード付き投稿"
emoji: "🤖"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["pipedream", "typescript", "bluesky"]
published: true
published_at: "2025-04-18 10:30"
---

:::message
この記事は、[Xへのポストを復旧させた記事](./pipedream-actions-x-tweet)と強く関連しています。

最初の導入部分と「そもそもPipedreamとは」については、向こうを参照してください。
:::

## PipedreamにおけるBluesky連携

Blueskyについては標準でアカウント連携機能がついています。
ユーザー名とアプリパスワードの組み合わせを登録することで、組み込みのアクションを簡単に利用できます。

![](/images/pipedream-actions-bluesky-linkcard/list-of-prebuild-actions.png)

単純なテキスト投稿をするだけなら`Create Post`を利用すれば事足りるので、これで十分な人には便利です。
しかし、アクションの動作設定まで進むとはっきりするのですが、**本当にテキストを投稿する機能**しかありません。

![](/images/pipedream-actions-bluesky-linkcard/configure-prebuild-create-post.png)

AT Protocolにおけるテキストメッセージ投稿は、リンクにまつわる設定を適切に付与しないと本当にプレーンテキストとして扱われます。
したがって、この方式だとURLをメッセージに含めても本当にURL文字列が貼られるだけになってしまいます。

それだと、普段利用しているWeb画面経由での操作で実現できることが難しいため、なんとかする必要があります。

## AT Protocolによるリンクカード付き投稿

※記事として出すことを優先して、表現をちょっと雑にしています。

Blueskyの土台となるAT Protocolにおいて「リンクカード付き投稿」は明確に次の2要素に別れています。

* リンク情報や表示したい画像を情報としてまとめた、【埋め込み用モデル情報】
* 【埋め込みモデル情報】への参照を含む、【投稿情報】

この2個の【情報】はAPIとしても別に登録する必要があるため、2回に分けてAPIコールする必要があります。
しかし、ユーザー視点としてはこれらを1回の操作で実現することが望ましいです。
そのため、組み込みアクションは一切使えないですし、カスタムアクションの中でも`Build any Bluesky API request`も使えません。

## PipedreamにおけるBlueskyアカウント連携

ここで、一度カスタムアクション候補の中にある`Use any Bluesky API in Node.js`を選択してみましょう。

```javascript
import { axios } from "@pipedream/platform"
export default defineComponent({
  props: {
    bluesky: {
      type: "app",
      app: "bluesky",
    }
  },
  async run({steps, $}) {
    return await axios($, {
      url: `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${this.bluesky.$auth.did}`,
      headers: {
        Authorization: `Bearer ${this.bluesky.$auth.oauth_access_token}`,
      },
    })
  },
})
```

アクションとしての振る舞いは`run()`内に記述していくことになるのですが、`this.bluesky`を参照することで連携しているBlueskyアカウントのアクセストークンを使用できます。
この中で複数回のAPIコールをすることが出来るため、いい感じに実装することでカスタムアクションとしての実現ができます。

この時点で試したい場合は、このあたりの記事を見るとよいでしょう。

* https://zenn.dev/ryo_kawamata/articles/8d1966f6bb0a82
* https://pixeler.condb.link/bluesky-linkcard/
* https://nigauri.me/tech/bluesky/post-to-bluesky-using-gas/3/

## 再利用性を高める

Xの時と同様に、こちらも再利用する可能性が極めて高いです。
そのため、こちらもPipedream CLI経由で登録可能な形式にします。

### アクションの登録

PipedreamのCLIをインストールしたうえで、次のような作業をするだけで使えるようになります。

```console
git clone https://github.com/attakei-lab/pipedream-components
cd pipedream-components
pnpm install
pnpm -r build
pd publish packages/components/dist/bluesky/send-post-with-opengraph-url.mjs

```

<!-- textlint-disable -->

Pipedreamのアクション選択時に「My Actions」のフィルターを選択すると、自分が登録したアクションから`Bluesky/Send post with OpenGraph URL.`を選べるようになります。

<!-- textlint-enable -->

![](/images/pipedream-actions-bluesky-linkcard/select-actions.png)

### アクションの動作設定

アクションの動作設定では、現状だと次の3個を要求します。

![](/images/pipedream-actions-bluesky-linkcard/configure-custom-ction.png)

* `Message text`: プレーンテキストとして表示させたいメッセージ。
* `URL to link`: リンクカードにしたいURL。なお、現状だとOGP対応している必要がある。
* `Bluesky accout`: 事前連携済みのBlueskyアカウント。

## 中身を見たい人向け

先ほどはリポジトリのリンクを貼りましたが、コードだけを見ればよいのなら、こちらを参照してください。

https://github.com/attakei-lab/pipedream-components/blob/main/packages/components/src/bluesky/send-post-with-opengraph-url.mts

先ほど上げた参考記事と実装方針自体は大きく変わっていません。
特徴を1つ挙げるとしたら、APIサービスを使ってURLからOpen Graphのメタデータをオブジェクトとして抽出しているところでしょうか。

また、X用のカスタムアクションと比較すると、`props`内に`type: "app"`の要素があるからなのか、アクション選択時に明確に「Blueskyの連携があること」が分かるようになっています。

### Dub

Dub自体は、（おそらく）短縮URLを生成するサービスです。
提供しているツール類の中にMetatags APIというものがあり、入力したURLのHTMLからOpen Graph用のメタタグ設定を抽出してJSON化してくれます。

https://dub.co/tools/metatags

上記ページに行くと説明があるのですが、Web APIとしての形式も提示してくれているため、Fetchなどを駆使することで簡単に必要な情報を抽出できます。 [^1]

[^1]: 余談ですが、PyPIのプロジェクトURLがBotリクエストからガードする動作になっているため、こういうツールでないと簡単にメタ情報を取れなくなっています。

## 今後やれると良いこと

<!-- textlint-disable -->

AT Protocolを適切にハンドリングできれば、実現可能なことはかなり多いはずです。
例えば、「長文投稿したら自動的にスレッドにする」と言ったことも実現可能なので、必要性があったらやってみようと思います。

<!-- textlint-enable -->
