---
title: "Sphinxのconf.pyを3行にする"
emoji: "🗜️"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Sphinx", "python"]
published: false
---

:::message
後述しますが、この記事はatsphinx-toyboxで管理している機能を使っています。
つまり、遊び半分に作っており最低動作はするものの実用保証はしません。
:::


Python製ドキュメントビルダーのSphinxは、ビルドにまつわる設定を`conf.py`というPythonソースで記述します。

これは、「設定値の組み立てにPythonの動作をフル活用できる」という点では便利ですが、一方で「変に凝れてしまうため複雑になる」というリスクを内包することにもなります。 [^1]

[^1]: ということにしておいてください。

というわけで、`conf.py`の中身を別場所で管理できるようにしてみました。

## やりかた

### 前提

説明の簡素化のために、次のことを前提として説明します。

* 依存ライブラリを`pyproject.toml`で管理する。
* Sphinxのドキュメントを`sphinx-quickstart`で生成している。
* ドキュメントはGitリポジトリのルートから見てdocsフォルダ上にある。

### 改めて、やりかた

1. `atsphinx-toybox`をインストールする。
2. `conf.py`の中身を`pyproject.toml`内の`[tool.sphinx-build.docs]`セクションに移植する。（制約条件等については後述）
3. `conf.py`の中身を下記のようにする。
4. 普通にビルドする。

変更後の`conf.py`がこちら。

```python:conf.py
from atsphinx.toybox.pyproject import load

load()
```

代わりに、`pyproject.toml`がこんな感じになります。
なお、`extensions`欄に`atsphinx.toybox.pyproject`を入れる必要はありません。 [^2]

[^2]: Sphinx拡張としての機能を持っていないため、登録してしまうとむしろビルド時にエラーとなります。

```toml:pyproject.toml
[tool.sphinx-build.docs]
project = "my-document"
author = "Kazuya Takei"

extensions = [
    "sphinx.ext.githubpages",
    "atsphinx.footnotes",
]

    # ... その他、たくさんの設定項目
```

## `pyproject.toml`での記述時における制約事項

ファイルフォーマットが大きく変わるため、`conf.py`での記述時と比較するとかなりの制約を受けることになります。
（とはいえ、`conf.py`側に残せばいいだけではあるのですが）

### Noneがない

TOMLの仕様 [^3] を読むと分かるのですが、設定可能な型にNULLがありません。
そのため、`conf.py`の中で`None`を明示的に設定する必要がある際にちょっとした手間を掛ける必要があります。

[^3]: https://toml.io/ja/v1.0.0

### 項目の再利用が出来ない

Sphinxは同じソースから複数のフォーマットを生成する仕様のため、`conf.py`の中ではビルダーごとの設定を管理することになります。
とはいえ類似項目も多いため、`revealjs_static_path = html_static_path`のように設定済みの項目をそのまま再利用したりするケースがあります。 [^4]

[^4]: 個人的に一番使っているのが、`html_title = f"{project} v{release}"` という、サイトタイトルの調整です。

一方でTOML上では項目間で相互に参照する仕様が存在しません。 [^3]
そのため、必然的にすべての項目をベタ書きする必要が出てきます。

### 他ライブラリの関数を使った値設定が出来ない

いくつかのSphinx拡張では、動作上の理由から「`conf.py`内で関数などをインポートして、その実行結果を設定に利用する」ことを要求するケースがあります。

TOMLはあくまで設定項目のみを扱い関数の実行は不可能であるため、これらの動作を移植することは不可能と言ってよいでしょう。

### setupを定義できない

Sphinxにおける`conf.py`には、`setup()`という関数を定義することで「Sphinxビルド時の動作にさらなる介入をする」ということが可能になっています。

TOMLには関数という概念も無いため、どうしても必要な場合は何かしらの手段で維持する必要があります。

## 内部の仕組み

この記事を書いている時点での、`load()`の内部構造を簡単に解説します。

### `conf.py`の場所を特定する

Sphinxはビルドのための`sphinx-build`の実行時にソースフォルダを引数として指定します。[^5] このソースフォルダにある`conf.py`を設定ファイルとして認識します。
ここからどうやって`conf.py`を読み取るかというと、execを使っています。 [^6] <!-- textlint-disable-lie -->

[^5] https://www.sphinx-doc.org/en/master/man/sphinx-build.html
[^6] https://github.com/sphinx-doc/sphinx/blob/master/sphinx/config.py#L580

モジュールとしてインポートをしているわけではないため、`sys.modules`などから探索するのも困難です。
そこで今回は、`inspect` [^7] を利用しています。

[^7]: https://docs.python.org/ja/3.13/library/inspect.html

```python:pyproject.py
import inspect

def load():
    caller = inspect.stack()[1]
    conf_py = Path(caller.filename).resolve()
```

`ispect.stack()`を使い`load()`呼び出し時のスタック情報を取得できるため、一階層手前を取得すればそのまま呼び出し元であるコードとしての`conf.py`にたどり着けます。
なお、スタック情報にはファイルの場所自体も残っているので、`.filename`プロパティを使えば簡単に取得可能です。

### `pyproject.toml`の場所を特定する

取得した`conf.py`のファイルパスを下に、設定を管理しているだろう`pyproject.toml`を探します。
これ自体はシンプルに`pathlib` [^8] を活用して「順に上の階層に登っていきファイルを見つけたら終了」としています。

[^8]: https://docs.python.org/ja/3.13/library/pathlib.html

`.parents`を使えば無理のない形で最後まで遡れはするのですが、少しだけ利用イメージを考えてGitリポジトリのルートまでしか遡らないようにしています。

```python:pyproject.py
from pathlib import Path
from typing import Optional

def find_pyoroject(conf_py: Path) -> Optional[Path]:  # noqa: D103
    for d in conf_py.parents:
        pyproject_toml = d / "pyproject.toml"
        if pyproject_toml.exists():
            return pyproject_toml
        if (d / ".git").exists():  ".gitフォルダがある -> Gitリポジトリのルート"
            break
    return None
```

### `pyproject.toml`の値を`conf.py`の変数として扱えるようにする

`pyproject.toml`からのデータ抽出自体は、標準ライブラリに搭載された`tomllib` [^9] を使えるので非常に簡単です。JSONと同様に`tomllib.loads()`するだけ。
問題は、これをどう`conf.py`に引き渡すかです。

[^9]: https://docs.python.org/ja/3.13/library/tomllib.html

`inspect`で扱うスタック情報の中には、frameという要素があります。
frameにはいくつか属性があるのですが、その中に`f_locals`という「frameから見たローカル変数」を管理しているdictが存在します。
このdictにKey-Valueのペアを追加することで、比較的あっさりと引き渡すことが出来ます~~（よい実装かどうかは別として）~~。

```python:pyproject.toml
import inspect
import tomllib

def load():
    caller = inspect.stack()[1]
    conf_py = Path(caller.filename).resolve()
    pyproject_toml = find_pyoroject(conf_py)
    # 中略
    # TOMLファイルをdictにして、対象の階層を取得
    pyproject = tomllib.loads(pyproject_toml.read_text())
    conf_base = pyproject["tool"]["sphinx-build"][conf_py.parent.stem]
    # load()呼び出し元のフレームにアクセスして、ローカル変数に設定項目を移植する
    caller.frame.f_locals.update(
        {k: v for k, v in conf_base.items() if not k.startswith("_")}
    )
```

## この機能の有用性

とりあえず、以前から出ていた話題をふと思い出したときに、「現状なら楽な取り組み方もあるかな？」と試してみました。
Pythonプロジェクトのメタデータが`setup.cfg`を参照するようになった頃の懐かしさを感じます。

<!-- textlint-disable -->

もしSphinxドキュメントを書きつつ「`conf.py`が複雑化しがち」だったり、普段から無意識に技巧を凝らしてしまいがちな人にとっては、シンプルなTOMLのみでしか書けなくなる制約は良いものと言えそうです。

<!-- textlint-enable -->

ただ、せっかく`pyproject.toml`で管理するのであれば、`project.name`のようなPythonプロジェクトで普段から使う項目をそのまま引き継いで利用したいですね。
加えて簡単なテンプレート構文を用意できると、一機能としては使い勝手が良さそうです。