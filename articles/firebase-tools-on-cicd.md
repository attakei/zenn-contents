---
title: "CI/CDのためのFirebase スタンドアロンバイナリ"
emoji: "🔄"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - Firebase
  - GitLab
published: false
---

Firebaseに何かをデプロイするケースがある際、素直に使ってるだけなら普通に`npm`ベースで`firebase-tools`を使うのが一番楽と考える人は多いでしょう。
実際に普段の自分が使う場合も、ほとんどのケースでは`npm`ースのツールを使っています。

ところが、ちょっと自分のデプロイ環境で「構成の大半が非Node.js」という事態が起きました。
この事態に対する対応策を探していたところ、「スタンドアロンバイナリ」の存在に気づいたので、使ってみることにしました。

そこで、の記事ではスタンドアロンバイナリの紹介をしつつ利用事例をまとめています。

## スタンドアロン版Firebase CLI

前述の通り、Firebase CLIは`firebase-tools`という名称で`Node.js`用のパッケージとして公開されています。

スタンドアロン版Firebase CLIは、**Googleが公式に提供しているシングルバイナリ版のFirebase CLIファイル**です。
WindowsやmacOSだけでなくLinux対応版も提供されており、[CLIについてのFirebaseドキュメント](https://firebase.google.com/docs/cli#install_the_firebase_cli)でも、次のような人をターゲットに挙げています。

- Node.jsを普段使わない人
- CLIでのワークフロー利用者

## ワークフローにおける利用を考える

### npmベースCLIを利用するワークフロー

Node.js製CLIツールのインストールは、一般的に`npm install -g firebase-tools`のようにグローバルインストールが推奨されていることが多いです。
しかし、これだとインストール先が当然ながグローバル領域になります。そうなると、ワークフロー上でキャッシュさせにくく、ちょっと面倒です。 [^1] [^2]

`Node.js`のアプリ開発の過程でCLIツールを使うのであれば、`devDependencies`を用いたローカルインストールが可能です。
アプリ環境セットにして「アプリの提供全体に必要な依存関係を全てまとめられる」のは、このスタイルの利点となります。
ロジェクトルートの`./node_modules`フォルダは、ワークフローからでも比較的キャッシュ設定がしやすく、自分も普段このスタイルを採用しています。

とはいえ、`Node.js`を使っているならともかく、こんなケースではデプロイのためだけに`package.json`を管理しないといけなくなります。

- ビルドとデプロイに関連性が薄い
- そもそもNode.jsを使ってない

[^1]: 例えば、`/usr/lib/node_modules`といった場所にインストールされることになります
[^2]: 頻繁な更新が必要にならないため、毎回インストールするのは、リソースに優しくありません

### スタンドアロンバイナリを利用するワークフロー

スタンドアロンバイナリを使う場合、`curl`などを利用してワークフロー上で直接ダウンロードして利用することになります。
（後ほど実例を出します）

この場合は、`Node.js`関連のファイルを一式ピンポイントで管理せずに済むというメリットがあります。
さらに、ダウンロード済みバイナリはキャッシュ可能なため、ちょっと手間ですが「対象バイナリが無い場合みダウンロード」といったことも可能になります。[^3]

[^3]: キャッシュ戦略を取らない場合は、気楽に「常に最新版を利用できる」いう恩恵を受けられます

## 実例(GitLab-CI/CD)

自分が書いてみた、スタンドアロンバイナリを利用したFairebaseデプロイの例です。
(要点のみを抜粋しています)

```yaml:.gitlab-ci.yml
deploy:
  only:
    - master
  when: manual
  image: google/cloud-sdk:slim
  script:
    - export GOOGLE_APPLICATION_CREDENTIALS=$GCLOUD_SERVICE_ACCOUNT_JSON
    - gcloud auth activate-service-account --key-file ${GCLOUD_SERVICE_ACCOUNT_JSON}
    # Collect artifacts
    - echo "Some operations"
    # Deploy to firebase
    - curl -Lo firebase https://firebase.tools/bin/linux/latest
    - chmod +x ./firebase
    - ./firebase use $GCLOUD_PROJECT
    - ./firebase deploy
```

今回主軸となるのは、`# Deploy to firebase`以降の処理です。
GitLab-CI/CDベースの説明になりますが、他のワークフローでも、ローカル利用でも使用感はあまり変わらないでしょう。

### Firebase CLIのダウンロード

```shell-session
$ curl -Lo firebase https://firebase.tools/bin/linux/latest
$ chmod +x ./firebase
```

Firebaseドキュメントにもリンクがある通り、直接ダウンロード出来るURLが存在するので、`curl`などでダウンロードするだけです。
実体はGitHubでホスティングされているので、リダイレクト追跡をするオプションが必要になります。 [^4]

パーミッション設定は特にされていないので、忘れずに`chmod`などで実行権限を付与しましょう。

[^4]: `curl`の場合は`-L`オプションが対象

### Firebaseコマンドを実行する

この時点で`./firebase -h`を実行すると、ちょっとした待ち時間の後にヘルプテキストが表示されるようになります。

上記のように動作確認を終えた後は、普段使いのFirebaseと同様にコマンドを使っていけます。

```shell-session
$ ./firebase use $GCLOUD_PROJECT
$ ./firebase deploy
```

自分の場合は、単純にデプロイするいがは要件が無いため、`./firebase use`でプロジェクトを指定して、`./firebase deploy`でデプロイしているだけです。

※実際には、前後にメインで指定しているイメージ(not Node.js)でしか出来ないオペレーションを挟んでいます。

### 使用感

もともとのワークフローでは、「ローカルインストールしてキャッシュさせる」スタイルを取っていました。

これをスタンドアロンバイナリに変えてみたのですが、体感としてはさほど処理時間の変動が見られませんでした。[^5]
前述の通りキャッシュなしの状態での比較なのですが、これならキャッシュをさせなくてもそこまで苦労しなさそうです。[^6]

[^5]: 定量比較してないのと、他のジョブ整理の一環でやったので、明確なBefore/Afterをしていません
[^6]: Runnerの環境的にもダウンロード速度が比較的出るのもあって、「キャッシュをやりくりする時間」を変に考慮するより気楽です

## 感想

内外のいくつかのプロジェクトでFirebaseを使っているのですが、自分はどちらかというと「GCPに程よくFastly+UIを被せるラッパー」と捉えています。
その関係でアプリケーション層にNode.jsを使う選択肢をあまり取ってないのですが、そういった用途にスタンドアロンバイナリは有用な選択肢でした。

間違いなくだいぶ前からあったのですが、今回気づけたので色々な場面で楽ができそうです。
