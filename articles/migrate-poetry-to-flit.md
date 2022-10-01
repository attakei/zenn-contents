---
title: "PoetryからFlitのマイグレーションノート"
emoji: "🛫"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["python"]
published: false
---

ちょっとした経緯があって、いくつかのPythonパッケージの管理用ライブラリを `Poetry` [^1] から `Flit` [^2] に変えました。
この際の基本的な動き方を整理しておくための記事です。

## 前提

以下の環境で書いています。

```
» python --version
Python 3.10.6
» poetry --version
Poetry version 1.1.12
» flit --version
Flit 3.7.1
```

また、次の2点を満たす環境であるものとします。

* Poetry用の `pyproject.toml` がある
* ソース類をGitHubで管理している

## Flitをインストールする

基本的には特に何も考えずに `pip install flit`してください。
必要に応じて`--user`オプションをつけましょう。

## `pyproject.toml`を再生成する

`flit init`を実行することで、Flit用の`pyproject.toml`を作成できます。

`Poetry`などを利用しており既に`pyproject.toml`が存在する場合は、上書き確認されます。
すでにリポジトリ管理下ならいくらでも戻せるので、ひとまず上書きしてしまいましょう。

```shell
» flit init
pyproject.toml exists - overwrite it? [y/N]: y
Module name: sphinxcontrib-budoux
Try again.
Module name: sphinxcontrib_budoux
Author [Kazuya Takei]:
Author email [myself@attakei.net]:
Home page:
Choose a license (see http://choosealicense.com/ for more info)
1. MIT - simple and permissive
2. Apache - explicitly grants patent rights
3. GPL - ensures that code based on this is shared with the same terms
4. Skip - choose a license later
Enter 1-4 [2]:

Written pyproject.toml; edit that file to add optional extra info.
```

`init`時の注意事項として「`flit init`時に指定できるパッケージ名にハイフンが使えない」というものがあります。
PyPI上でハイフンを使っている場合だとこれだと困るとは思いますが、後でなんとか出来るのでアンダースコアにしておきましょう。

## パッケージ情報を移植する

### ほとんどの情報

`pyproject.toml`の主目的が主目的なので、`[tool.poetry]`の中身のいくつかは、`[project]`セクションにそのまま移植できます。
そのため、Gitツールの部分unindexなどを駆使してもともとの設定を戻していくと良いでしょう。特に`classifiers`は大量なので忘れずに。

なお、Poetryだと`project.homepage`として管理している項目は、Flitでの`flit init`後は`project.urls.Homepage`として管理されます。
URLの類は基本的に`[project.urls]`側に書くと良いでしょう。

このあたりの作業時には、[Flitのドキュメント](https://flit.pypa.io/en/latest/pyproject_toml.html)を参照してください。

### 依存パッケージ

Poetryにおける依存パッケージの情報は、`tool.poetry.dependencies`などのツール独自の管理体制になっていました。
Flitでは`project.dependencies`といった`[project]`配下になり、記述方法も変化しています。

```toml:pyproject.toml
# Before from Poetry
[tool.poetry.dependencies]
python = "^3.6 | ^3.7 | ^3.8 | ^3.9 | ^3.10"
watchdog = "*"
Sphinx = "*"
click = "*"

# After from Flit
[project]
dependencies = [
    "click",
    "Sphinx",
    "watchdog",
]
```

パッケージのバージョンに制約を書けたい場合は、`Sphinx >=5`のような形式で記述しましょう。

### 追加の依存パッケージ

いわゆる`extra_requires`の領域ですが、`project.optional-dependencies`で管理します。
ネストした管理になるので、後述するように`[project]`とは分けて管理すると良いです。

```toml:pyproject.toml
[project.optional-dependencies]
test = [
    "black >=22.3.0,<23",
    "flake8 >=3.8.4,<4",
    "pytest >=6.2.2,<7",
]
```

### パッケージの構成ソースの指定

先程書いた通り、Flitは「パッケージの記号にアンダースコアを使うこと」を前提としています。
そのため、パッケージ名としてハイフン付きの名前を指定したい場合は、追加の作業として「モジュールの指定」が必要になります。

例えば、自分が作成したパッケージである`sphinx-watch` [^3] は名前の通りハイフンが使われています。
この場合は`project.name`に指定しているものは`sphinx-watch`なのですが、パッケージ実体は`sphinx_watch`となっています。
このギャップを埋めるために、`tool.flit.module`を使うことが出来ます。

```toml:pyproject.toml
[tool.flit.module]
name = "sphinx_watch"
```

## ローカル開発環境について

Poetryを使っていた頃は、`pyproject.toml`と生成される`poetry.lock`をもとにvirtualenvが利用可能です。
Flitになると使えなくなるのですが、ひとまず`python -m venv`を利用しましょう。

```shell
python -m venv .venv
flit install --python .venv/bin/python
```

## GitHub Actionsの編集

テストやデプロイなどにGitHub Actionsを利用している場合は、こちらも忘れずに修正する必要があります。

一例としては、こんな感じになります。

```diff
name: Testings

on:
  push:
  pull_request:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.7', '3.8', '3.9', '3.10']
    steps:
      - uses: actions/checkout@v3
-     - run: pipx install poetry
      - uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
-         cache: 'poetry'
-     - run: poetry install
+     - run: pip install flit
+     - run: flit install
-     - run: poetry run black --check .
-     - run: poetry run pytest
+     - run: black --check .
+     - run: pytest
```

## 感想

実験を兼ねて複数のパッケージを変えてしまったのですが、使われているセクションもあってか、心持ち記述がシンプルになった印象を持ちました。

Poetryにはあった仮想環境構築が無くなったっぽいので、ここをスマートに運用する方法があるかが課題になりうるかなといった感じです。

[^1]: https://python-poetry.org/
[^2]: https://flit.pypa.io/en/latest/
[^3]: https://pypi.org/project/sphinx-watch
