---
title: "Sphinxのカスタムロールを即席で作った"
emoji: "🐍"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - "python"
  - "sphinx"
published: true
---

タイトルのとおりなのですが、PyPIに登録されているパッケージへのリンクを簡単にセットするSphinxロールを書いてみました。

ソース全体を見たい場合は、 [GitHubのスライド用リポジトリ](https://github.com/attakei/slides/blob/main/extensions/sphinxcontrib_pypi_role.py)ので参照してください。

## そもそもロールって？

Sphinx(ひいてはreStructuredText)における、ディレクティブとは別の拡張手法です。
ディレクティブがブロックレベルでの拡張を実現するのに対して、ロールはインラインの構成要素を拡張するような役割を持ちます。

例えば、Sphinxのプロジェクトでドキュメントへのリレーションを書きたいときは `` :doc:`other-doc` `` と記述することで、ファイル生成時にリンクを作成することが出来ます。

## 具体的にどんなロールなの？

今回作ってみたのは、 `:pypi:` というロールです。
このロールを使用すると、コンテンツの部分を「PyPI上にアップロードされているPythonパッケージの名前」とみなして、リンクを作成します。

<!-- textlint-disable ja-technical-writing/sentence-length -->
具体的には、 `` :pypi:`sphinx-revealjs` `` という記述に対してビルドを行うと、`<a class="reference external" href="https://pypi.org/project/sphinx-revealjs/"><strong>sphinx-revealjs</strong></a>` というHTMLを生成します。
<!-- textlint-enable ja-technical-writing/sentence-length -->

実利用例をソースとビルドで比較したい場合は、こちらを見てください。

* [ソース](https://github.com/attakei/slides/blob/main/source/pyconjp-2022/3_about-extension.rst)
* [ビルド時](https://slides.attakei.net/pyconjp-2022/#/3/6)

## なんで作ったの？

もちろん、ただリンクを記述するだけでも平気です。
上記の例で言えば、 `` `sphinx-revealjs <https://pypi.org/project/sphinx-revealjs/>`_ ``でも実現可能です。

今回のケースで言えば「PyConJPでの発表の際にディレクティブ以外の拡張手法も試しておきたかった」というのが一点。
もう一点は「同じようなリンクを並べたりする際のコストを減らしたかった」というのが理由です。

## 実装アプローチは？

[Sphinxのソース](https://github.com/sphinx-doc/sphinx/blob/5.x/sphinx/roles.py)にあった`PEP`ロールを流用しました。

参照系のロールを定義するには `ReferenceRole` を継承する必要がありそうです。
そのうえで、ディレクティブと同様に `run()` メソッドの中でPyPIへのURLを生成して、
ノードに登録する処理をすれば問題なく動作しました。

```python
from sphinx.util.docutils import ReferenceRole

class PyPIRole(ReferenceRole):
    def run(self):
        # docutils上のノードを生成する？
        target_id = 'index-%s' % self.env.new_serialno('index')
        entries = [
            ('single', f"PyPI package: {self.target}", target_id, '', None)
        ]
        index = addnodes.index(entries=entries)
        target = nodes.target('', '', ids=[target_id])
        self.inliner.document.note_explicit_target(target)

        # ロールのコンテンツ情報（self.target）をベースにPyPIへのURLを作成して、参照先として登録
        refuri = f"https://pypi.org/project/{self.target}/"
        reference = nodes.reference('', '', internal=False, refuri=refuri)
        if self.has_explicit_title:
            reference += nodes.strong(self.title, self.title)
        else:
            title = self.title
            reference += nodes.strong(title, title)

        return [index, target, reference], []
```

後は例によって `setup()` 上でロールとして登録すれば終了です。

```python
from docutils.parsers.rst import roles

def setup(app):
    roles.register_local_role("pypi", PyPIRole())
```


## PyPIに登録しないの？

現時点でPyPIに登録していない理由は大きく3つあります。

まずは、「流用が雑すぎる」という点。
シンプルに`PEP`とほとんど同じ実装をしています。
この行為そのものが極端にバッドという訳ではないのですが、PyPIに登録する際はもう少し身ぎれいにしておきたいと思っています。

次に、「この時点で既に追加昨日として欲しいものが存在する」という点。
このロールの利用用途を考えると、ライブラリドキュメントのリンクを作る際に、
「バージョン単位のURL」を生成したいとう自分内での要望が出来てしまっています。

最後に、「そんな時間がなかった」という点。
流石に登壇資料作成と同時進行でまたパッケージを増やす度胸はありませんでした。


というわけで、時間があったらプロジェクトとして整備した後にPyPIへ登録しようとは思っています。
