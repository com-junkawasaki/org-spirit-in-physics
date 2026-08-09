# Private Spirit Self-Study

本人研究者 `junkawasaki` だけを対象にした、ローカル専用 N-of-1 実験アプリです。

この実装での `spirit` は、主観・行動・任意の生理指標から構成される時間依存の情報モデルです。独立した情報生命体の存在、診断、治療、恒久的な人格変容を主張しません。

## Run

```sh
pnpm --dir apps/private-self-study test
pnpm --dir apps/private-self-study dev
```

`http://127.0.0.1:5173` をMacBookで開きます。外部 API、クラウド送信、テレメトリは使用しません。
サーバーはNode標準ライブラリだけを使い、127.0.0.1に限定してbindします。アプリ固有の第三者runtime/build依存はありません。

セッション開始時に camera/mic の明示許可が必要です。camera は 64×48 の明るさ・フレーム変化量、mic は RMS・peak を計算します。camera 映像と連続 mic 音声は保存しません。言語連想課題では、明示表示のもと各語30秒・2MB以内の回答音声だけを端末内に保存します。刺激は内蔵 display と speaker から提示します。

## Data boundary

- セッションはブラウザの IndexedDB にだけ保存します。
- camera 映像と連続 mic 音声は保存せず、回答音声クリップと集約数値を分離して保存します。
- 回答音声は専用 IndexedDB object store に置き、セッション読込時だけ対応trialへ復元します。
- 暗号化 export は PBKDF2-SHA-256（250,000 iterations）と AES-256-GCM を使います。
- `private-data/`、`*.session.json`、`*.encrypted.json` は gitignore 対象です。
- 他の既存参加者データは読み込みません。

## Interpretation boundary

単回セッションでは「直前・直後の短期差」だけを表示します。探索的な構造変容候補は、両条件を各 3 回以上、安全イベントなし、条件差 0.15 以上という事前条件をすべて満たした場合にだけ表示します。それでも因果や一般化の証明ではありません。

XMILE は `models/spirit-self-regulation.xmile` にあります。これは観測結果ではなく、adaptive/neutral 刺激が regulation、arousal、coherence、agency に及ぼしうる関係を記述した仮説モデルです。

## Apple device extension (design only)

Apple Vision Pro、Apple Watch、ペアリング済み iPhone を用いる段階設計は `../../docs/apple-vision-watch-private-self-study-design.md`、機器間契約は `protocol/apple-device-contract.edn`、閉ループ仮説は `models/apple-closed-loop-spirit.xmile` にあります。ネイティブアプリと人体セッションはまだ実装・実施していません。

MacBook先行版の境界は `protocol/macbook-sensor-contract.edn` と `../../docs/adr-2026-08-09-macbook-sensor-stimulus-app.md` に記録しています。この版ではセンサー駆動の閉ループ適応はまだ行いません。

## Word association and emotion analysis

事前自己評価の後に、12語の探索的な言語連想課題を実施します。最初の入力までの時間、回答完了時間、本人の快・不快／強度、各trialのcamera/mic集約値を記録します。結果は同一セッション内の記述比較だけに使い、ユング的コンプレックス、無意識、人格、診断を判定しません。

Hugging Faceモデルの調査結果は `../../docs/huggingface-emotion-model-review-2026-08-09.md` にあります。モデルIDとrevisionは保存構造へ組み込みましたが、現在のアプリは推論を実行せず `not-run` と記録します。

回答音声には、校正値を考慮した RMS 平均、peak、発声区間率、録音時間のローカル記述分析を行います。文字起こし・話者識別・音声感情推論は実行しません。録音境界は `../../docs/adr-2026-08-09-local-voice-answer-recording.md` にあります。
