---
title: "PyScriptのpy-envは記述に応じてどんな動きをするかを調べてみる(パッケージ名編)"
emoji: "🐍"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["python", "pyscript"]
published: true
---

※「パッケージ名編」とは書いたものの、「相対パス編」をやるかは未定です。

## 概要

PyScriptに使われる`py-env`タグの中身が、値に応じてどう解釈され、PyScriptはどう振る舞うかをつらつらと試してみた記事です。

## 前提

以下の環境での動作確認を踏まえて書いてます。

* 2022年7月2日時点でのコード
* `https://pyscript.net/alpha/pyscript.js`, `https://pyscript.net/alpha/pyscript.css` を利用したもの
* Pythonの`http.server`モジュールで動作させているビルトインサーバーへのアクセス
* 簡易的な事実確認

### 書かない

PyScriptについての前説、アーキテクチャなどの大半について。

## py-env 要素について

そのページにおけるPyScriptの動作において、追加でモジュールを利用する際に宣言する要素です。
PyScriptの起動時において、この要素を解釈して必要なライブラリ・モジュールを取りまとめることを可能にします。

スーパー雑に書くと、PyScriptにとっての`requirements.txt`みたいなものです。

PyScriptのドキュメント上は[ここ](https://github.com/pyscript/pyscript/blob/main/docs/tutorials/getting-started.md#the-py-env-tag)を参照してください。

## 結論：対応しているライブラリ

試して認識できている範囲では、次のいずれかなら対応しています。これ以外のものはwheelファイルを用意して相対パス指定が必要になりそうです。

- Pyodideのpackagesとして登録されているライブラリ（この場合は、Pure Pythonでなくても可）
- PyPIに登録されているPure Pythonなライブラリ

## どんな動きをするかを個別に試してみる

### 前置き

* `py-script`要素には、「ライブラリのインポート」まで書いて、`locals()`の結果出力までやる。
* ブラウザのDevToolでリクエストの状況を眺める。
* (余裕があれば)複数のOSで試す。

### Pyodide 内でまとめられているライブラリ

`py-env` のパッケージ指定として、「Pyodide」に登録されているものを使う場合。

```html
<py-env>
- beautifulsoup4
</py-env>
```

![](/images/py-env-of-pyscript/pyoide-packages.png)

この場合は、 `beautifulsoup4`と依存ライブラリである`soupsieve`をjsdelivrから入手しています。

Pyodide側では、次のライブラリはリポジトリの`packages`配下で管理されており、条件を満たせばこの挙動が適用されそうです。

- 汎用性の高い(とみなしている)ライブラリ
- 科学計算系のライブラリ
- これらの動作に必要とするライブラリ

```html
<py-env>
- numpy
</py-env>
```

このあたりは、コンパイルが必要なタイプも同じで、Pyodideが予めWASM向けのwheelを用意してくれています。

### Pyodide内で管理されていないライブラリ（pure-python編）

`py-env` のパッケージ指定として、「Pyodide」に登録されていないものを使う場合。

「PyScriptを利用してDNS問い合わせをしてみたくなった」と仮定して、DNSPythonを利用しようとしてみましょう。

```html
<py-env>
- DNSPython
</py-env>
```

![](/images/py-env-of-pyscript/pypi-packages-pure.png)

先程と違い、次の通信をしています。

1. PyPI に対して `https://pypi.org/pypi/dnspython/json` のリクエストを実行
2. dnspythonのstableバージョンを認識した上で、`dnspython-2.2.1-py3-none-any.whl`をダウンロード

つまり、探索順としてJsdelivr(Pyodide管理下)→PyPIという振る舞いをしており、PyPIにあるライブラリは割りと何でもインストールできそうな気がします。

### Pyodide内では管理されていないライブラリ（none-pure-python編）

さて~~何を血迷ったか~~PyScriptで機械学習の何かをやってみたくなったとします。
とりあえず、機械学習ということでTensorflowをインストールさせてみましょう。

```html
<py-env>
- Tensorflow
</py-env>
```

![](/images/py-env-of-pyscript/pypi-packages-notpure.png)

さて、この状態でブラウザにアクセスすると、PyScriptの初期化が完了しません。

リクエストを状況を見るとPyPIに `https://pypi.org/pypi/tensorflow/json`のリクエストをするところまでは、先ほどと同じようです。
しかし、wheelファイルの入手には進まないようです。（[wheelファイル自体は存在します](https://pypi.org/project/tensorflow/#files)）

改めてDevToolのコンソールを覗いてみましょう。

![](/images/py-env-of-pyscript/pypi-packages-notpure-console.png)

`Couldn't find a pure Python 3 wheel for 'tensorflow'.`と出ています。
どうやら、PyPI上にあるパッケージといえども、Pure Pythonなもの（`～none-any.whl`）に限定されるようです。

### Pyodideに管理されているが、バージョン違いのライブラリ(pure-python編)

諸事情で`docutils`のちょっと古いバージョンが必要になったとします。

```html
<py-env>
- docutils==0.17.1
</py-env>
```

![](/images/py-env-of-pyscript/pyoide-packages-old.png)

jsdelivrにはdocutilsの0.18系しか無いらしく、PyPIから探しに行きます。

### Pyodideに管理されているが、バージョン違いのライブラリ(none-pure-python編)

同様に、numpyのちょっと古いバージョンを使おうとしてみましょう。
諸事情で`docutils`のちょっと古いバージョンが必要になったとします。

```html
<py-env>
- numpy==1.21.0
</py-env>
```

![](/images/py-env-of-pyscript/pyoide-packages-old-notpure.png)

jsdelivrにあるnumpyは1.22系だったため、やっぱりPyPIから探しに行きます。
しかし、「numpyはpure-pythonのwheelが無い」というTensorflowと同様の理由でインストールに失敗しています。

## まとめ

PyScriptはPyPIからもちゃんとパッケージを探索してくれているようです。
そのため「Pure Pythonなアプリケーション」を前提とした場合は色々と遊ぶ余地がありそうでした。
