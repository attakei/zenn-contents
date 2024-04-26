---
title: "Blueskyで初めて触れる人向けの、ふんわりoEmbed解説"
emoji: "🌐"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - bluesky
  - oEmbed
  - HTML
published: true
---

2024/04/19頃、Bluesky Socialにてポスト等の埋め込みが提供されるようになりました。

https://bsky.social/about/blog/post-embeds-guide

この記事ではポスト埋め込み機能と付随してリリースされたoEmbed APIについて整理します。

## Bluesky Socialのポスト埋め込み機能

下の画像は、[このポスト](https://bsky.app/profile/attakei.dev/post/3kqmooj3ems2w)の右下にあるメニューをクリックした様子です。
![Bluesky Socialで埋め込み投稿のHTMLを取得するためのリンク画面](/images/oembed-from-bluesky-social/nav-for-embed-post.png)

「投稿へのリンクをコピー」の下に「Embed post」というメニューが表示されています。
このメニューをクリックするとダイアログが表示され、下記のHTMLをコピーできます。

```html:embed-post.html
<blockquote class="bluesky-embed" data-bluesky-uri="at://did:plc:tjf4apt65s75xiojhiqzvcan/app.bsky.feed.post/3kqmooj3ems2w" data-bluesky-cid="bafyreicfbeae3zz7fjqwrdquqkwzvv7ixudbgr26ho37r4bbchigm6bkua">
  <p lang="ja">
    今日の #sphinxjp 1個目。先月に来てたPRに昨日気づいたので、慌てず急いで確認してマージして、ついでに環境整備をした後にリリース。
    - Embed contents取得時にリダイレクトの追従をするようになっただけ
    - 一応、組み込みでSphinx拡張モードがあるので、無関係ではないです
    <br>
    <br>
    <a href="https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan/post/3kqmooj3ems2w?ref_src=embed">[image or embed]</a>
  </p>
  &mdash; kAZUYA kAKEI (<a href="https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan?ref_src=embed">@attakei.dev</a>)
  <a href="https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan/post/3kqmooj3ems2w?ref_src=embed">Apr 21, 2024 at 15:09</a>
</blockquote>
<script async src="https://embed.bsky.app/static/embed.js" charset="utf-8"></script>
```

※適宜整形しています。

内容としてはXの埋め込みポストと基本的には大きく変わらず、次の2要素で構成されています。

- 「投稿内容が最初から分かるようなテキスト」含み、`data-bluesky-uri`,`data-bluesky-cid`属性を持つ`blockquote`要素。
- 上記属性を元に整形するであろう`script`要素。

このHTMLを自サイトなどに貼ることで、自身のポストや他者のポストを「適切なスタイルで引用」することが出来ます。

さて、この埋め込みポストに関する機能の一環として次の要素が追加されるようになりました。 [^1]

```html:https://bsky.app/profile/attakei.dev/post/3kqmooj3ems2w
<html>
<head>
  <!-- 312行目あたり -->
  <link
    rel="alternate"
    type="application/json+oembed"
    href="https://embed.bsky.app/oembed?format=json&url=at%3A%2F%2Fdid%3Aplc%3Atjf4apt65s75xiojhiqzvcan%2Fapp.bsky.feed.post%2F3kqmooj3ems2w"
  />
</head>
<body>
</body>
</html>
```

次のセクションではこの`link`要素にまつわる**oEmbed**について解説します。

[^1]: 2ヶ月ほど前に見たときには無かったため、おそらく今回の機能更新でしょう。

## oEmbed

https://oembed.com/

### oEmbedとは

oEmbedとは名前にもある通り、「あるサイトコンテンツを他サイトへ埋め込みで埋め込み引用」させるための共通仕様です。

引用手法として考えられるアプローチとしては「スクリーンショットと取得して画像として貼り付け」や「引用元をパースして整形」といったものがあります。
しかし、oEmbed APIが提供されているサイトであれば、API経由でサイトが想定している引用形態を取得できるため、引用が容易になります。

UCG系サイトでは案外導入されていることが多く、ソースのパース・スクリーンショットよりoEmbed経由で取得したコンテンツを埋め込むことが望ましい利用法と言えるでしょう。

### oEmbedに対応しているかを知るには

oEmbedはサイト側が対応しない限り使えないものなので、「そもそも対応しているか」を知る必要があります。

次のどちらかの方法を用いて確認できます。

#### 公開されているプロバイダー一覧から確認する

oEmbedのサイト内にて、[プロバイダーとしてAPI経由でを提供しているサイト](https://oembed.com/providers.json)がまとめられています。
このJSONファイル内を調べることで、例えばYouTubeやInstagramといったサイトがoEmbedに対応しておりAPIを公開していることが分かります。
ただし、あくまで[GitHub上でのPRによる運用](https://github.com/iamcal/oembed)になるため、実際は対応していても掲載されていないことがあります。 [^2]

[^2]: 2024/04/23時点では、Bluesky Socialは未掲載です。

#### HTMLソースから確認する

前述の通りマスターには未掲載であっても、oEmbedに対応していることはあります。
HTMLソースを確認することで、対応有無を判別が可能です。

```html:https://bsky.app/profile/attakei.dev/post/3kqmooj3ems2w
<html>
<head>
  <!-- 312行目あたり -->
  <link
    rel="alternate"
    type="application/json+oembed"
    href="https://embed.bsky.app/oembed?format=json&url=at%3A%2F%2Fdid%3Aplc%3Atjf4apt65s75xiojhiqzvcan%2Fapp.bsky.feed.post%2F3kqmooj3ems2w"
  />
</head>
<body>
</body>
</html>
```

こちらは再掲となるBluesky Socialにおけるポスト単体のHTMLの一部です。
下記の条件を満たす`link`要素を探してみてください。存在するなら、eEmbedに対応しています。

- `rel`が`"alternate"`である。
- `type`が`"application/json+oembed"`か`"text/html+oembed"`のいずれかである。
- `href`がoEmbedの規格を満たすリクエスト用のURLとなっている。(規格については後述)

## oEmbed APIを試してみる

ここからは、oEmbed APIの仕様と実際のレスポンスを確認しながら「どのような情報を得られるか」を追いかけてみます。

基本的に[`httpie`(CLI)](https://httpie.io/) [^3],[`jq`](https://jqlang.github.io/jq/) [^4] でレスポンスの様子を紹介していきます。
読みつつ確認したい場合は、事前に準備をしてください。

[^3]: Python製のHTTPリクエストクライアント。デスクトップ版もあるが、今回はCLI版を利用。
[^4]: インプットされたJSON文字列を加工をするCLIツール。

### 軽く仕様に触れる

oEmbed APIのリクエスト/レスポンスについての仕様は、[oEmbedのサイト](https://oembed.com/#section2)に記載されています。
大まかに説明すると、次のことが出来るように定められています。

- リクエス
  - [MUST] GETリクエストであること。
  - [MUST] クエリパラメーターに`url`を含むこと。
  - [CAN] 埋め込み時のサイズを伝えるために、クエリパラメーターに`maxwidth`,`maxheight`を含めて良い。
  - [CAN] レスポンスのフォーマットを指定するために、クエリパラメーターに`format`を含めても良い。
- レスポンス
  - [MUST] JSON形式かXML形式で返すこと。ただし、リクエスト時のクエリーパラメーターに`format`が含まれている場合は要求に従うこと。
  - [MUST] レスポンス内のパラメーターには`type`,`version`を含み、更に`type`の内容に応じて必須とされるパラメーターを含んでいること。
    - 例）`type`=`"photo""`であれば、画像本体のURLを示す`url`やサイズを示す`width`,`height`も必須。
  - [SHOULD] リクエストされた内容が条件を満たさない場合は、所定のHTTPリクエストステータスを返すと良い。

### 実際にAPIにアクセスする

仕様を簡単に知ったところで、前セクションで出てきたBluesky Social上の投稿HTML内に`link`要素として記載されていたURLにアクセスしてみます。

```console
$ http https://embed.bsky.app/oembed \
    format==json \
    url==at://did:plc:tjf4apt65s75xiojhiqzvcan/app.bsky.feed.post/3kqmooj3ems2w

{
    "author_name": "kAZUYA kAKEI (@attakei.dev)",
    "author_url": "https://bsky.app/profile/attakei.dev",
    "cache_age": 86400,
    "height": null,
    "html": "<blockquote class=\"bluesky-embed\" data-bluesky-uri=\"at://did:plc:tjf4apt65s75xiojhiqzvcan/app.bsky.feed.post/3kqmooj3ems2w\" data-bluesky-cid=\"bafyreicfbeae3zz7fjqwrdquqkwzvv7ixudbgr26ho37r4bbchigm6bkua\"><p lang=\"ja\">今日の #sphinxjp 1個目。先月に来てたPRに昨日気づいたので、慌てず急いで確認してマージして、ついでに環境整備をした後にリリース。\n- Embed contents取得時にリダイレクトの追従をするようになっただけ\n- 一応、組み込みでSphinx拡張モードがあるので、無関係ではないです</p>&mdash; <a href=\"https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan?ref_src=embed\">kAZUYA kAKEI (@attakei.dev)</a> <a href=\"https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan/post/3kqmooj3ems2w?ref_src=embed\">2024-04-21T06:09:12.368Z</a></blockquote><script async src=\"https://embed.bsky.app/static/embed.js\" charset=\"utf-8\"></script>",
    "provider_url": "Bluesky Social",
    "type": "rich",
    "version": "1.0",
    "width": 550
}
```

...要求URLがAT Protocolなのは流石と言ったところでしょうか。

気を取り直して、レスポンスを眺めてみましょう。
先程出てきた仕様の通り、`type`,`version`が含まれていることが分かります。
そして、まず注目するとよいのは`type`の内容で、今回は`"rich"`となっています。

`"rich"`は名前からも分かるように「リッチコンテンツ」であることを示す種別です。
oEmbedで定義されている種別は`photo`,`video`,`link`,`rich`の4種類で、「画像・動画のどちらでもないがコンテンツは埋め込める」というものは全てこれになります。

仕様の「2.3.4.4. The `rich` type」のセクションを読んでみましょう。
共通パラメーター以外に`html`,`width`,`height`が必須パラメーターとして定義されています。

```console
$ http https://embed.bsky.app/oembed \
    format==json \
    url==at://did:plc:tjf4apt65s75xiojhiqzvcan/app.bsky.feed.post/3kqmooj3ems2w \
  | jq '.html, .width, .height'

"<blockquote class=\"bluesky-embed\" data-bluesky-uri=\"at://did:plc:tjf4apt65s75xiojhiqzvcan/app.bsky.feed.post/3kqmooj3ems2w\" data-bluesky-cid=\"bafyreicfbeae3zz7fjqwrdquqkwzvv7ixudbgr26ho37r4bbchigm6bkua\"><p lang=\"ja\">今日の #sphinxjp 1個目。先月に来てたPRに昨日気づいたので、慌てず急いで確認してマージして、ついでに環境整備をした後にリリース。\n- Embed contents取得時にリダイレクトの追従をするようになっただけ\n- 一応、組み込みでSphinx拡張モードがあるので、無関係ではないです</p>&mdash; <a href=\"https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan?ref_src=embed\">kAZUYA kAKEI (@attakei.dev)</a> <a href=\"https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan/post/3kqmooj3ems2w?ref_src=embed\">2024-04-21T06:09:12.368Z</a></blockquote><script async src=\"https://embed.bsky.app/static/embed.js\" charset=\"utf-8\"></script>"
550
null
```

これらのパラメーターは「直接埋め込むためのHTML」「埋め込み時の幅」「埋め込み時の高さ」となっています。
なお、`height=null`となってしまっているのは、埋め込み時点でも基本的には確定させることが出来ないためでしょう。

さて、改めて、`html`の中身だけに注目してみましょう。

```Console
$ http https://embed.bsky.app/oembed \
    format==json \
    url==at://did:plc:tjf4apt65s75xiojhiqzvcan/app.bsky.feed.post/3kqmooj3ems2w \
  | jq -r '.html'

<blockquote class="bluesky-embed" data-bluesky-uri="at://did:plc:tjf4apt65s75xiojhiqzvcan/app.bsky.feed.post/3kqmooj3ems2w" data-bluesky-cid="bafyreicfbeae3zz7fjqwrdquqkwzvv7ixudbgr26ho37r4bbchigm6bkua"><p lang="ja">今日の #sphinxjp 1個目。先月に来てたPRに昨日気づいたので、慌てず急いで確認してマージして、ついでに環境整備をした後にリリース。
- Embed contents取得時にリダイレクトの追従をするようになっただけ
- 一応、組み込みでSphinx拡張モードがあるので、無関係ではないです</p>&mdash; <a href="https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan?ref_src=embed">kAZUYA kAKEI (@attakei.dev)</a> <a href="https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan/post/3kqmooj3ems2w?ref_src=embed">2024-04-21T06:09:12.368Z</a></blockquote><script async src="https://embed.bsky.app/static/embed.js" charset="utf-8"></script>
```

これまでと違い、`jq`の`-r`オプションを利用してエスケープをさせていません。
見たことがある内容ではないでしょうか？

そうです。
これは**Bluesky SocialのEmbed post時にコピーできるHTMLと同じもの**です。
このレスポンス内容から、ブラウザを経由することなしに「プログラムで直接埋め込みコンテンツを取得する」ことが可能になっています。

```python:fetch-embed-post.py
 /// script
# dependencies = ["requests", "beautifulsoup4"]
# ///
# This is idea from https://nikkie-ftnext.hatenablog.com/entry/henry-schreiner-pipx-supports-pep723-dependencies-metadata
import requests
from bs4 import BeautifulSoup

CONTENT_URL = "https://bsky.app/profile/attakei.dev/post/3kqmooj3ems2w"
print(f"=== Content is {CONTENT_URL}")

resp = requests.get(CONTENT_URL)
soup = BeautifulSoup(resp.content, "html.parser")
link = soup.find("link", {"rel": "alternate", "type": "application/json+oembed"})
oembed_url = link["href"]
print(f"=== API is {oembed_url}")

resp = requests.get(oembed_url)
data = resp.json()
print(f"=== Embed content is \n{data['html']}")
```

HTMLとJSONorXMLのパースが無理なく可能な言語であれば、自由に扱えるのも「oEmbedという仕様が定まっている」恩恵と言えるでしょう。

### クエリーパラメーターの調整をしてみる

さて、リクエスト時の仕様として下記の事項がありました。

> 埋め込み時のサイズを伝えるために、クエリパラメーターに`maxwidth`,`maxheight`を含めて良い。

そこで「サイドバーに貼りたい」という仮想目的を立てて、クエリーパラメーターで幅調整が出来るかを試してみましょう。

```Console
$ http https://embed.bsky.app/oembed \
    format==json \
    url==at://did:plc:tjf4apt65s75xiojhiqzvcan/app.bsky.feed.post/3kqmooj3ems2w \
    maxwidth==240

{
    "author_name": "kAZUYA kAKEI (@attakei.dev)",
    "author_url": "https://bsky.app/profile/attakei.dev",
    "cache_age": 86400,
    "height": null,
    "html": "<blockquote class=\"bluesky-embed\" data-bluesky-uri=\"at://did:plc:tjf4apt65s75xiojhiqzvcan/app.bsky.feed.post/3kqmooj3ems2w\" data-bluesky-cid=\"bafyreicfbeae3zz7fjqwrdquqkwzvv7ixudbgr26ho37r4bbchigm6bkua\"><p lang=\"ja\">今日の #sphinxjp 1個目。先月に来てたPRに昨日気づいたので、慌てず急いで確認してマージして、ついでに環境整備をした後にリリース。\n- Embed contents取得時にリダイレクトの追従をするようになっただけ\n- 一応、組み込みでSphinx拡張モードがあるので、無関係ではないです</p>&mdash; <a href=\"https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan?ref_src=embed\">kAZUYA kAKEI (@attakei.dev)</a> <a href=\"https://bsky.app/profile/did:plc:tjf4apt65s75xiojhiqzvcan/post/3kqmooj3ems2w?ref_src=embed\">2024-04-21T06:09:12.368Z</a></blockquote><script async src=\"https://embed.bsky.app/static/embed.js\" charset=\"utf-8\"></script>",
    "provider_url": "Bluesky Social",
    "type": "rich",
    "version": "1.0",
    "width": 240
}
```

`maxwidth`｀を短めの`240`にしてみました。すると、レスポンスの`width`も追従して`240`に変化することが分かります。
とはいえ、肝心の`html`の中身は変化していません。これはBluesky Socialの埋め込みポストが`embed.js`経由で適切にレンダリングするので、あまり意味が無いというのもあります。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->
:::details maxwidth,maxheightに意味がある例
<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

YouTubeの動画URLもoEmbedに対応しているのですが、APIからレスポンスされる`html`が「動画再生のためのiframe」という形式を取っています。
そのため、`iframe`要素の属性に設定する幅/高さについてAPIへのリクエスト時にある程度の調整が可能となっています。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->
1 - 通常の例
<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

```Console
$ http https://www.youtube.com/oembed \
    format==json \
    url=='https://www.youtube.com/watch?v=Oyh8nuaLASA'

{
    "author_name": "attakei",
    "author_url": "https://www.youtube.com/@attakei",
    "height": 113,
    "html": "<iframe width=\"200\" height=\"113\" src=\"https://www.youtube.com/embed/Oyh8nuaLASA?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Yoshi (NES - Nintendo Switch Online) / Speedrun B-Type(Level 1 to 5) in 6min 15s 940ms\"></iframe>",
    "provider_name": "YouTube",
    "provider_url": "https://www.youtube.com/",
    "thumbnail_height": 360,
    "thumbnail_url": "https://i.ytimg.com/vi/Oyh8nuaLASA/hqdefault.jpg",
    "thumbnail_width": 480,
    "title": "Yoshi (NES - Nintendo Switch Online) / Speedrun B-Type(Level 1 to 5) in 6min 15s 940ms",
    "type": "video",
    "version": "1.0",
    "width": 200
}
```

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->
2 - `maxwidth`を指定する例
<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

```Console
$ http https://www.youtube.com/oembed \
    format==json \
    url=='https://www.youtube.com/watch?v=Oyh8nuaLASA' \
    maxwidth==720

{
    "author_name": "attakei",
    "author_url": "https://www.youtube.com/@attakei",
    "height": 200,
    "html": "<iframe width=\"356\" height=\"200\" src=\"https://www.youtube.com/embed/Oyh8nuaLASA?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Yoshi (NES - Nintendo Switch Online) / Speedrun B-Type(Level 1 to 5) in 6min 15s 940ms\"></iframe>",
    "provider_name": "YouTube",
    "provider_url": "https://www.youtube.com/",
    "thumbnail_height": 360,
    "thumbnail_url": "https://i.ytimg.com/vi/Oyh8nuaLASA/hqdefault.jpg",
    "thumbnail_width": 480,
    "title": "Yoshi (NES - Nintendo Switch Online) / Speedrun B-Type(Level 1 to 5) in 6min 15s 940ms",
    "type": "video",
    "version": "1.0",
    "width": 356
}
```

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->
3 - `maxwidth`,`maxheight`を指定する例
<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

```Console
http https://www.youtube.com/oembed \
  format==json \
  url=='https://www.youtube.com/watch?v=Oyh8nuaLASA' \
  maxwidth==720 \
  maxheight==480

{
    "author_name": "attakei",
    "author_url": "https://www.youtube.com/@attakei",
    "height": 405,
    "html": "<iframe width=\"720\" height=\"405\" src=\"https://www.youtube.com/embed/Oyh8nuaLASA?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Yoshi (NES - Nintendo Switch Online) / Speedrun B-Type(Level 1 to 5) in 6min 15s 940ms\"></iframe>",
    "provider_name": "YouTube",
    "provider_url": "https://www.youtube.com/",
    "thumbnail_height": 360,
    "thumbnail_url": "https://i.ytimg.com/vi/Oyh8nuaLASA/hqdefault.jpg",
    "thumbnail_width": 480,
    "title": "Yoshi (NES - Nintendo Switch Online) / Speedrun B-Type(Level 1 to 5) in 6min 15s 940ms",
    "type": "video",
    "version": "1.0",
    "width": 720
}
```

ちょっと挙動が不思議ではありますが、`maxwidth`,`maxheight`の内容に基づいてiframeのサイズを調整してレスポンスしていることが分かります。

:::

## まとめ

この記事ではAPI利用者側の視点でoEmbedという規格について紹介してみました。
多くのUCGサイトで提供されており、使っている人は使っている便利な規格となっています。

今回のBluesky Socialの埋め込み投稿の正式対応と合わせてAPIが提供されるようにもなったので、みんな来ると良いのではないでしょうか。