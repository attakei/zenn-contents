---
title: "AUR向けにビルド済みバイナリをパッケージングした時に引っかかったこと"
emoji: "📦"
type: "tech"
topics:
  - archlinux
  - firebase
published: true
---

[#大晦日](https://twitter.com/hashtag/大晦日ハッカソン)[ハッカソン](https://omisoka-hackathon.connpass.com/event/233973/)に参加して、
当日成果物としてAUR(Arch Linux 用のユーザー製パッケージのリポジトリ)に[`firebase-tools-bin`](https://aur.archlinux.org/packages/firebase-tools-bin/)を登録しました。

https://twitter.com/attakei/status/1476791638299377666?s=20

<!-- textlint-disable ja-technical-writing/sentence-length -->
実態については、以前にZennで書いた「[CI/CDのためのFirebase スタンドアロンバイナリ](./firebase-tools-on-cicd)」を読んでもらったほうが早いのですが、
要するに「公式に提供されているバイナリをArch Linuxのフローでインストールしやすくする」だけのものです。
<!-- textlint-enable ja-technical-writing/sentence-length -->

yayなどを使っているなら `yay -S firebase-tools-bin` でインストールが出来るので、興味がある方は試してみてください。

**ここまでが前置きです。**

## AURにパッケージを登録するには

AURは「ユーザーが用意したビルド済みファイル群のアーカイブ」を置く場所ではなく、「ユーザーが自分でビルドするためのレシピとメタデータ」を置く場所となっています。
そのため、各パッケージごとに最低限用意しないといけないファイルは以下の2個のみとなっています。 [^1]

- `PKGBUILD` : `yay` などでのインストール時にローカルで「どんなファイルをダウンロードするか」「ダウンロード後に何をするか」などを定義したファイル
- `.SRCINFO` : AURのデータベースとして管理閲覧する際の情報のみを持つファイル

詳細は省きますが [^2] 、今回はAURに登録するものと入ってもビルド済みバイナリを扱うだけのため、比較的簡単に終了する...はずでした。

[^1]: さらに言えば、`.SRCINFO`は`PKGBUILD`から抽出出来るもののため、実質的に着目しないといけないファイルは1個だけ。
[^2]: 後日に、時間を見つけてもうちょっと実際に試した際のAUR登録などについての細かい整理は自分用に書いてみたい。

## インストールしたバイナリが動作しない

一番最初に用意した`PKGBUILD`がこちらです。

```bash:PKBUILD
pkgname=firebase-tools-bin
pkgver=10.0.1
pkgrel=1
pkgdesc=" The Firebase Command Line Tools (bundled official standalone binary)"
arch=('x86_64')
url="https://github.com/firebase/firebase-tools"
license=('MIT')
conflicts=('firebase-tools')
source=(
    "https://github.com/firebase/firebase-tools/releases/download/v${pkgver}/${pkgname/-bin/}-linux"
)
md5sums=(
    '64dd4eb456d4cc4b60e1b9bffb051c18'
)

package() {
    name=${pkgname/-bin/}-linux
    chmod +x ${srcdir}/${name}
    install -Dm755 "${srcdir}/${name}" "${pkgdir}/usr/bin/firebase"
}
```

<!-- textlint-disable ja-technical-writing/max-ten -->
はっきり言って、なんの変哲もない「ダウンロードして、実行権限を付与して、所定のフォルダにインストールする」というだけのファイルです。
もちろん、パッケージング用のコマンド`makepkg`でも何も問題なくパッケージの作成が完了します。
<!-- textlint-enable ja-technical-writing/max-ten -->

しかし、実際に作成されたパッケージを`pacman`を使ってインストール後に問題が起きました。
Firebase CLIが起動しません。

```
$ firebase
Pkg: Error reading from file.
```

これは困りました。背景はともかく、原因を探さないとAUR登録にたどり着けません。

## 原因を探す

`PKGBUILD`の動作確認する際に`makepkg`を実行すると、基本的には実行時のフォルダ上に`source`で指定したファイルをダウンロードします。

```
$ ls -l
total 151020
-rw-r--r-- 1 attakei attakei  13929552 Jan  2 01:44 firebase-tools-bin-10.0.1-1-x86_64.pkg.tar.zst
-rwxr-xr-x 1 attakei attakei 140696171 Jan  2 01:44 firebase-tools-linux
drwxr-xr-x 3 attakei attakei      4096 Jan  2 01:44 pkg
-rw-r--r-- 1 attakei attakei       799 Jan  2 01:44 PKGBUILD
drwxr-xr-x 2 attakei attakei      4096 Jan  2 01:44 src
```

実際にダウンロードした物自体は、正しいバイナリのようです。 [^3]

パッケージングのタイミングだと`pkg`内のものをアーカイブにしているので、中身を見てみましょう。

```
» ls -l pkg/firebase-tools-bin/usr/bin
total 37056
-rwxr-xr-x 1 attakei attakei 37941752 Jan  2 01:57 firebase
```

ファイルサイスが小さい？どうやら、パッケージングのどこかでバイナリを壊しているように見えます。

だとすると、パッケージング処理時になにか起きているのでしょうか？
ひとまず、`package()`の際に`ls`を突っ込んでみることにしました。

```bash:PKGBUILD(抜粋)
package() {
    name=${pkgname/-bin/}-linux
    chmod +x ${srcdir}/${name}
    install -Dm755 "${srcdir}/${name}" "${pkgdir}/usr/bin/firebase"
    ls -l ${pkgdir}/usr/bin/firebase
}
```

```
$ makepkg
(前略)
==> Starting package()...
-rwxr-xr-x 1 root root 140696171 Dec 31 22:20 /usr/bin/firebase
==> Tidying install...
  -> Removing libtool files...
  -> Purging unwanted files...
  -> Removing static library files...
  -> Stripping unneeded symbols from binaries and libraries...
  -> Compressing man and info pages...
(後略)
```

ダウンロードしたときのものとファイルサイズがおなじになっています。
つまり、`package()`の時点で何かが起きているわけではなさそうです。

あーだこーだトライ＆エラーをしている時に、ふとこの出力が引っかかりました。

```
$ makepkg
(前略)
==> Starting package()...
-rwxr-xr-x 1 root root 140696171 Dec 31 22:20 /usr/bin/firebase
==> Tidying install...
  -> Removing libtool files...
  -> Purging unwanted files...
  -> Removing static library files...
  -> Stripping unneeded symbols from binaries and libraries...
  ↑？？？？？
```

`package()`直後に行われている処理群ですが、ファイル類の削除の他に`Stripping ～`という妙な処理をしています。

Arch Wikiにある[パッケージの作成](https://wiki.archlinux.jp/index.php/%E3%83%91%E3%83%83%E3%82%B1%E3%83%BC%E3%82%B8%E3%81%AE%E4%BD%9C%E6%88%90)を改めて読んでみました。

> 5. バイナリやライブラリから不要シンボルを除去する (symbol stripping)。

うーん、状況的にこれが怪しそうです。
というわけで、この処理を無効化出来ないか探します。

再度Arch Wikiより、今度は[PKGBUILDの説明](https://wiki.archlinux.jp/index.php/PKGBUILD)を読んでみます。

すると、`options`を利用して挙動の上書きを出来るみたいです。今回の場合は「シンボル除去」を「無効化」したいので、`!strip`を含めてみましょう。

```bash:PKGBUILD
# Maintainer: Kazuya Takei <myself@attakei.net>

pkgname=firebase-tools-bin
pkgver=10.0.1
pkgrel=1
pkgdesc=" The Firebase Command Line Tools (bundled official standalone binary)"
arch=('x86_64')
url="https://github.com/firebase/firebase-tools"
license=('MIT')
conflicts=('firebase-tools')
## ↓追加
options=('!strip')
## ↑追加
source=(
    "https://github.com/firebase/firebase-tools/releases/download/v${pkgver}/${pkgname/-bin/}-linux"
)
md5sums=(
    '64dd4eb456d4cc4b60e1b9bffb051c18'
)

package() {
    name=${pkgname/-bin/}-linux
    chmod +x ${srcdir}/${name}
    install -Dm755 "${srcdir}/${name}" "${pkgdir}/usr/bin/firebase"
```

```
$ makepkg
(前略)
==> Starting package()...
==> Tidying install...
  -> Removing libtool files...
  -> Purging unwanted files...
  -> Removing static library files...
  -> Compressing man and info pages...
(後略)
```

`Tidying install`のセクションから、`Stripping ～`の処理が消えたようです。

```
$ ls -l pkg/firebase-tools-bin/usr/bin
total 137400
-rwxr-xr-x 1 attakei attakei 140696171 Jan  2 02:36 firebase
```

ファイルサイズも元通りに戻りました。

検証時にローカルインストールしていたパッケージを削除した後に、AURへの登録を実施。
そのまま直接AURのものをインストールしたところ、`firebase`コマンドが正しく機能しました。

<!-- textlint-disable ja-technical-writing/ja-no-successive-word -->
めでたしめでたし。
<!-- textlint-enable ja-technical-writing/ja-no-successive-word -->

[^3]: 実際に実行をしてみても、ヘルプが表示されます。

## まとめ

* AURの登録は簡単に取り組めて、シンプルな構成をしている
* `makepkg`はビルド済みバイナリにも作用する処理を含むので注意すること
* Arch Wikiの説明量はすごいので、困ったらちゃんと読むこと
