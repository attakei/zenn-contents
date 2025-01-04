---
title: "ABlogでのSphinxブログ構築時の日本語タクソノミー対策"
emoji: "🌐"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["sphinx", "unicode", "python"]
published: true
published_at: '2025-01-04 20:10'
---

自分の個人サイトのリフレッシュを進めている最中なのですが、この際にABlog周りで起きたトラブルと対処のメモです。

## Sphinx拡張 "ABlog" のちょっとした紹介

https://pypi.org/project/ablog

ABlogはSphinx拡張の1つで、Sphinxドキュメントにブログ機能を追加します。
大雑把には、次のようなことが出来ます。

- カテゴリー、タグごとに対象の記事をまとめてHTML出力する。
- Disqusを利用して、コメント欄を埋め込む。
- サイドバー用に、タグクラウドを生成する。
- RSSフィードを出力する。

## ablog利用時のちょっとしたトラブル

ablogで管理する記事であることを宣言するには、`post`ディレクティブを用います。

```rest:article-1.rst
============
記事タイトル
============

.. post::
   :category: Tech
   :tags: ゲーム

記事本文。
```

この記述がある状態でビルドをすると、次のようなファイルが出力されます。

```
- BLOG/
  - article-1.html
  - category.html
  - category/tech.html
  - tag.html
  - tag/ケーム.html
```

<!-- textlint-disable -->

…「おや？」と思うかもしれません。
reStructuredText上のソースにある記述と比べると、次のように違うファイル名で出力されています。

<!-- textlint-enable -->

- 【Tech】ではなく【tech】
- 【ゲーム】ではなく【ケーム】

※一応、生成されるHTML上はちゃんと【ゲーム】というテキストに【ケーム】というリンク先となっています。

## 原因

タグやカテゴリーに関するページのファイルを作成する際に、実はタグ名を直接使っているわけではありません。
実際には`slugify`という関数を通して、URL向けに適した文字列を生成して取り扱うようになっています。

さて、[GitHuで公開されているslugifyの実装](https://github.com/sunpy/ablog/blob/6481949a4f0a298dbbf2093094437be749d30a3a/src/ablog/blog.py#L23)を見てみます。
この関数は大まかに「Unicodeの正規化」「正規表現でURLとして使える形式に整形」という処理で構成されています。
それぞれの処理自体は（おそらく）問題ないのですが、この2処理が組み合わさって予期せぬ？事故が起きてしまっています。

### `unicodedata.normalize`の動き

この関数が何をするかについては、Pythonドキュメントを参照しましょう。

https://docs.python.org/ja/3.13/library/unicodedata.html#unicodedata.normalize

> Unicode 文字列 unistr の正規形 form を返します。 form の有効な値は、'NFC'、'NFKC'、'NFD'、'NFKD' です。
> 
> (略)
>
> 正規形 KD (NFKD) は、互換分解 (compatibility decomposition) を適用します。すなわち、すべての互換文字を、等価な文字で置換します。正規形 KC (NFKC) は、互換分解を適用してから、標準分解を適用します。

ドキュメントにある通り、Unicodeの正規形を返す関数ではあります。Unicodeの細かい話はあまり触れません。
重要なポイントとして、Dで終わる正規化形式は「要素分解をして状態にする」という動作をするということが挙げられます。

つまり、**「`ゲ`+`ー`+`ム`」を「`ケ`+`゛`+`ー`+`ム`」に分解します。**

Wandboxでその様子を再現しています。

https://wandbox.org/permlink/F3XFZ0PKx8lyfHfn

### 正規表現の挙動

次の行で、`re.sub(r"[^\w\s-]", "", string)`という処理が施されています。
これは大雑把に「文字と空白文字とハイフン以外を見つけたら削除する」という振る舞いをします。

URLやファイル名として機能しやすい文字にするため、記号類を除去するのが目的なのでしょう。
`%`のようにURLエンコード時に使われる記号などを考えると、確かにこの処理自体は必要そうに思えます。

### 悪魔合体の結果

<!-- textlint-disable -->

ここまでに上げた2個の処理は、一見すると真っ当なことをしているように見えます。実際に真っ当だと思います。
しかし、組み合わさってしまった結果、**「分解された濁音が記号扱いとなり、`re.sub`の削除対象になる」**という事件が起きてしまいます。
<!-- textlint-enable -->

つまりこんな流れです。

1. 「`ゲ`,`ー`,`ム`」を受け取る。
1. `normalize`によって「`ケ`,`゛`,`ー`,`ム`」になる。
1. `re.sub`によって「`ケ`,`ー`,`ム`」

内部処理的には、あくまでタグ名称は「ゲーム」でタグファイル名が「ケーム」になっています。
ので、リンク切れ等によるサイトとしての破綻をするわけではありません。

ただ、ABlogの外枠での処理が面倒ですし、なにより**美しくありません**。

## 対策という名の魔改造

というわけで、ここからは対策をしていきましょう。

表題にもあるとおり、あまりPythonのコードとしてもあまり行儀の良くない「魔改造」と言えるものです。

```python:conf.py
def setup(app):
    from ablog import blog  # type: ignore

    def slugify(string: Any) -> str:
        string = normalize("NFKC", str(string))
        string = re.sub(r"[^\w\s-]", "", string).strip().lower()
        return re.sub(r"[-\s]+", "-", string)

    blog.slugify = slugify
```

もし`conf.py`に`setup()`が無いなら、これをそのまま貼れば動くはずです。 [^1]

[^1]: 個人的な嗜好から、実際には現在`lower()`を除去したうえで、空白文字はアンダースコアに変換しています。

唯一の違いは、normalizeの第一引数でしていしている`"NKFC"`です。`"NKFD"`から正規化形式を変更しています。
正規化Cは、正規化Dと同様に分解をした後に、再度結合までを行っています。
そのため、一度`ゲ`を`ケ`,`゛`へ分解した後に、一文字の`ゲ`に再度戻しています。

<!-- textlint-disable -->

そのため、URLにも`ゲーム`を使えるようになりました。めでたしめでたし。

<!-- textlint-enable -->

## これをIssueと捉えるための考察

さて、これはできればGitHub上のIssue（不具合というか提案？）として報告したいとは思ってるんですけど、どう整理しましょうかね？

### "NFKC"に切り替えて欲しいのか

今回の事象の根っこにあるのは、「正規化においてタイプDを使っている」点にあるというのはそうです。
実際に、タイプCを使用することで解決する話ではあります。

しかし、これはあくまで自身が日本語利用者であることに起因しています。
少なくとも、「ゲ」と「ケ」は明確に別物と言えるでしょう。

とはいえ、他の言語ではどうなのでしょう？「実は分解されていたほうが良いのかも？」と考えてしまいます。

### 引数で切り替えていけると良いのか？

では、`slugify()`にオプションの第二引数を定義してしまうのはどうでしょう？

```python:ablog/blog.py
def slugify(string, form="NFKD"):
    ...
```

```python:ablog/__init__.py
def setup(app):
    app.add_config_value("ablog_slugify_form", "NFKD", ...)
    ...
```

…使われ方を考慮すると単純にこれだけするのは難しそうです。

### slugify自体を切り替えれば良いのか？ 

```python:ablog/__init__.py
def setup(app):
    app.add_config_value("ablog_slugify", "ablog.blog:slugify", ...)
    ...
```

こうしたうえで、拡張のどこかのタイミングで指定した関数を魔改造対処と同様に上書きする方法を考えてみました。
…どう考えても魔改造の幇助では。