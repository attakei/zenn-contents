---
title: "sphinx-revealjsの簡単な紹介"
---

この本の主軸となる `sphinx-revealjs` の紹介をします。

実際に使い方を追いたい場合は読み飛ばしても構いませんが、
今回のガイドブックのエッセンスになるので軽くでも眺めてみてください。

# sphinx-revealjs

`sphinx-revealjs`は、PyPIでも公開されているSphinx拡張の1つです。
`Sphinx`で読み取った入力ソースを、`Reveal.js`のプレゼンテーション形式のHTMLとして出力するものです。

この本を書いた本人である [@attakei](https://attakei.net/) が作成しており、ソースはGitHubにて公開されています。

## URL

- https://github.com/attakei/sphinx-revealjs

# Reveal.js

[Hakim El Hattab](https://hakim.se)によって開発されている、HTMLでのプレゼンテーションを作成するためのフレームワークです。

特徴的な表現として、「左右移動でメインセクションの進行」「上下移動でサブセクションの進行」を表現しています。
下のURLで表示されるスライドの動きを見て、**「なんか見たことある！」**と感じる人も多いのではないでしょうか。

プラグインによって結構な機能を有しており、例えば以下のようなことが可能となっています。

- Markdownをそのままスライドにする
- スピーカーノートを別ウィンドウで表示する

## URL

- https://revealjs.com
- https://github.com/hakimel/reveal.js

# 変換の概要

:::message
ここから先は、sphinx-revealjsの中身に関する簡単な解説です。
:::

`sphinx-revealjs` は、主にSphinxにおける「出力の拡張」にフォーカスを置いたライブラリです。

SphinxのビルトインHTML出力では表現できないReveal.jsの構造に合わせた出力をするようになっています。
また、reSTのプレーンな表現ではどうしても表現が難しい項目のために、いくつかのディレクティブを新規で追加をしています。

## 出力内容の話

以下のようなreSTがあったとします。

```rst
=====
Title
=====

First section
=============

Sub section 1
-------------

Sub section 2
-------------
```

Sphinxの通常のHTML出力のみでは、以下のような内容のHTMLを生成します。

```html
<div>
  <h1>Title</h1>
  <div>
    <h2>First section</h2>
    <div>
      <h3>Sub section 1</h3>
      <div></div>
      <h3>Sub section 2</h3>
      <div></div>
  </div>
</div>
```

`sphinx-revealjs`による出力では、以下のような内容になります。

```html
<section>
  <h1>Title</h1>
</section>
<section>
  <section>
    <h2>First section</h2>
  </section>
  <section>
    <h3>Sub section 1</h3>
    <div></div>
  </section>
  <section>
    <h3>Sub section 2</h3>
    <div></div>
  </section>
</section>
```

## ディレクティブの話

(TBD)
