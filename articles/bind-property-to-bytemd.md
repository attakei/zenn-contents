---
title: "bytemdにオブジェクトのプロパティを渡すためのひと工夫"
emoji: "🩹"
type: "tech"
topics:
  - React
  - Bytemd
  - ワークアラウンド
published: true
---

いわゆる、ワークアラウンド用のまとめです。

## Bytemdとは

[`bytemd`](https://www.npmjs.com/package/bytemd)はWYSIWYGなMarkdown編集を提供するJSコンポーネントです。
シンプルな組み込みで、それなりにきれいなエディター環境を提供してくれます。

本体としてはSevelte用であることが前提なのですが、公式側でReact,Vue向けのラッパーコンポーネントを提供してくれており、
Reactアプリケーションにも簡単に組み込めます。

[デモも公開されている](https://bytemd.netlify.app)ので、一度覗いてみてください。

## プレビュー用

@[codesandbox](https://codesandbox.io/embed/lingering-frost-xexcz?fontsize=14&hidenavigation=1&theme=dark)

## 困りごと

ここからは、`@bytemd/react`を利用したReactアプリケーションへの組み込みを前提とした話をします。[^1]

### ごくごくシンプルに使う

単純にMarkdownコンテンツをstateとして扱うだけなら、これだけで十分です。

```jsx
import { useState } from "react";
import { Editor } from "@bytemd/react";
import "bytemd/dist/index.min.css";

export default function App() {
  const [body, setBody] = useState("");
  return (
    <>
      <Editor value={body} onChange={setBody} />
      <pre>{body}</pre>
    </>
  );
}
```
※プレビュー用CodSandboxの、`Simple usage`

エディター部分の変種がリアルタイムで右ペインのプレビュー領域に表示されています。
エディター外の下部もリアルタイムで`body`の中身が表示されるようになっています。

### オブジェクトの一要素を編集するなら...？

とはいえ、Atomicなコンポーネントならともかく、一般的には複数の要素を統合して扱うことも多いでしょう。
そのようなケースでは、以下のような書き方をすることになるのではないでしょうか。

```jsx
import { useState } from "react";
import { Editor } from "@bytemd/react";
import "bytemd/dist/index.min.css";

export default function App() {
  // 実際はどこかから取ってきたエンティティなどが入る
  const [content, setContent] = useState({ title: "", body: "" });
  return (
    <>
      title:
      <input
        value={content.title}
        onChange={(e) => setContent({ ...content, title: e.target.value })}
      />
      <Editor
        value={content.body}
        onChange={(body) => setContent({ ...content, body })}
      />
      <pre>{JSON.stringify(content)}</pre>
    </>
  );
}
```
※プレビュー用CodSandboxの、`Have problems`

さて、CodeSandboxなどでこのコンポーネントを表示させて、タイトル用Inputタグとエディター領域を編集してみてください。

厄介なことに、**エディター部分でbodyを編集した瞬間にtitleの中身がリセット**されてしまいます。
これは困った。


コードを頑張って追う感じでは、`@bytemd/react`は内部で`ref`を作成しているようです。
どうも`ref`に渡した時点のオブジェクト要素として管理されてしまい、
`onChange`のタイミングでも`ref`時点の`content`しか渡ってこない...みたいです。[^2][^3]

## どう対処する（した）か

こうなりました。

```jsx
import { useEffect, useState } from "react";
import { Editor } from "@bytemd/react";
import "bytemd/dist/index.min.css";

export default function App() {
  const [content, setContent] = useState({ title: "", body: "" });
  const [body, setBody] = useState(content.body);

  useEffect(() => {
    setContent({ ...content, body });
  }, [body]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      title:
      <input
        value={content.title}
        onChange={(e) => setContent({ ...content, title: e.target.value })}
      />
      <Editor value={content.body} onChange={(body) => setBody(body)} />
      <pre>{JSON.stringify(content)}</pre>
    </>
  );
}
```
※プレビュー用CodSandboxの、`Fixed problems`

`body`を別のstateとしつつ、`useEffect`で`body`の変更を検知することで、`body`の変化に対する処理を2段階となるようにしています。
こうすることで、`Editor`コンポーネント内の`ref`は`content`を間接的にでも参照経路が切れるのか、想定する感じで動くようになります。

よかったよかった。

とはいえ、コードのクリーンさ的にも処理の煩雑さ的にも面倒なワークアラウンドではあるので、どこかのタイミングで修正されるといいんですけども。

[^1]: Vueではどうなるかは知らないです
[^2]: 深堀してません。現象としてそういうことかな？というぐらいの解釈です
[^3]: なお、例えばtitleを空ではなく何かしらの文字列にして開始すると、onChangeのたびにその文字列に戻ります
