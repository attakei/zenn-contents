---
title: "Python TutorとSphinx向け拡張"
emoji: "🖨"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Sphinx"]
published: true
published_at: '2024-10-14 12:00'
---

:::message
初稿はここで公開しますが、今後書き直したりしたものを別の場所に公開する可能性があります。
:::

すごく雑なきっかけで、Sphinx拡張を増やしました。 [^1]
この記事は、日本語で書いた簡易的なリリースノートです。

[^1]: 珍しく（？）、自分自身に強い需要もなく、かといって積極的に広めるビジョンも無いです。

## Python Tutorの紹介

https://pythontutor.com/

Python Tutorは、Pythonの教育用ツールで、コード実行時におけるメモリの使用や参照の状況を可視化くれます。
ステップ単位で見ていくことが出来るため、動作の理解に役立ちます。

「Python Tutor」という名称ではありますが、JavaやCなどのいくつかの言語にも対応しています。

### 使ってみる

以下のような流れで使っていきます。

1. https://pythontutor.com/visualize.html#mode=edit にアクセスする。
2. 横に「Write code in 〜」 とあるセレクトボックスから、言語を選択する。（今回であればPython 3.11を推奨）
3. その下のコードブロックにコードを書いていく。
4. コードを書いたら、コードブロックの下にある「Visualize Execution」ボタンをクリックする。
5. 実行の様子を確認できる画面に切り替わる。
6. コードの下にある、スクロールバーとボタンを操作して変数の動きを見る。（画面右に表示される）
7. コードを修正したい場合は、「Edit this code」のリンクをクリックすることで編集画面に戻る。

### 共有する

実行状態を共有したい場合は、「Generate permanent link」「Generate embed code」ボタンをクリックしてください。
それぞれのボタン右にコピー用のコードが出力されます。

例えば、「Generate permanent link」ボタンで出力されるのは[このリンク](https://pythontutor.com/render.html#code=members%20%3D%20%5B%22Mizuki%22,%20%22Kageyama%22,%20%22Matsumoto%22,%20%22Sakamoto%22,%20%22Endo%22%5D%0A%0Aprint%28f%22%E5%88%9D%E6%9C%9F%3A%20%7Blen%28members%29%7D%20%E4%BA%BA%22%29%0A%0Amembers.append%28%22Kitadani%22%29%0Amembers.remove%28%22Mizuki%22%29%0Amembers%20%2B%3D%20%5B%22Okui%22,%20%22Fukuyama%22%5D%0Amembers.remove%28%22Sakamoto%22%29%0Amembers.append%28%22Ricardo%22%29%0A%0Aprint%28f%22%E7%8F%BE%E5%9C%A8%3A%20%7Blen%28members%29%7D%20%E4%BA%BA%22%29%0A%0Afor%20m%20in%20members%3A%0A%20%20%20%20print%28m%29&cumulative=false&curInstr=0&heapPrimitives=nevernest&mode=display&origin=opt-frontend.js&py=311&rawInputLstJSON=%5B%5D&textReferences=false)のURLです。
「Next >」 というボタンを押していくと、listオブジェクトの操作と`for`文内の動作を見やすく表現してくれています。 [^2]

ドキュメント上で共有する際にはいずれかのURLを貼り付ける必要があるわけですが、若干管理が面倒です。
というのも、この仕組みの関係で貼り付けるURLを再生成するためには、Python Tutorにアクセス→コードを編集→リンクの再生成という手順を踏む必要があるためです。

とはいえ、実はURL内にコードがそのまま含まれています。
なるべくならこの特性を利用して楽に運用したいと思いませんか。

[^2]: Generate embed codeの方はiframeタグが出よくされるため、そのままHTML上に貼り付けることが出来ます。

:::details ちょっとした余談
さてこのURLですが、ちょっと変わった作りになっています。
大まかには次の2点がちょっと特殊です。

- 細かいパラメーターが、クエリパラメーターではなくアンカー部で宣言する形式を取っている
- コードがURLEncodeではない形式でエンコードされている

このせいで、続きの話がちょっと面倒になっています。
:::

## atsphinx-pythontutor

で、こんなのを作りました。

https://pypi.org/project/atsphinx-pythontutor/

名前の通りSphinx拡張でPython Tutor用のURL等を生成するためのものとなっています。

### 使うには

使い方自体は非常にシンプルです。

1. `conf.py`の`extensions`に、`"atsphinx.pythontutor"`を追加する。
2. 下記のようなディレクティブを記述する。

```rst
.. pythontutor::

   members = ["Mizuki", "Kageyama", "Matsumoto", "Sakamoto", "Endo"]
   
   print(f"初期: {len(members)} 人")
   
   members.append("Kitadani")
   members.remove("Mizuki")
   members += ["Okui", "Fukuyama"]
   members.remove("Sakamoto")
   members.append("Ricardo")
   
   print(f"現在: {len(members)} 人")
   
   for m in members:
       print(m)
```

これだけで、ビルドをすると`pythontutor`ディレクティブのある箇所には、記述したコードを使ったPython Tutorのiframeが出力されるようになります。

なお、`alt`オプションをつけると、そのテキストにはURLのリンクが貼られます。

### そもそもなんで作ったのか？

きっかけ自体はPyCon JP 2024のDeveloper Sprintに参加したことです。

これは例年PyCon JPのカンファレンスデーの翌日に行われる、集まったPythonisitaたちなどと一緒に開発や課題解決に取り組むイベントです。
特段チームで動くということをしていなかったのですが、たまたまPython Boot Campのリポジトリを見て、Python Tutorの存在を初めて知りました。
リンクやiframeがそのまま埋め込まれていたのですが、「もし自分のサイトで使うにしてもURLのまま管理するのはなんとなくやだ」というだけの理由でとりあえず作ったものです。

とりあえず、開発欲が解消されたので良い機会でした。
