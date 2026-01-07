# lakeFS セットアップガイド

## 1. Web UI 経由での初期セットアップ

### ステップ 1: Port Forward を開始

```bash
kubectl port-forward -n spirit-in-physics svc/infra-lakefs 8000:8000
```

### ステップ 2: ブラウザでアクセス

http://localhost:8000 にアクセスし、初回セットアップ画面で以下を入力:

- **Username**: `admin`
- **Access Key ID**: `AKIAIOSFODNN7EXAMPLE`
- **Secret Access Key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

### ステップ 3: リポジトリ作成

lakeFS UI から:
- **Repository Name**: `spirit-in-physics`
- **Storage Namespace**: `gs://com-junkawasaki-sip-dataset/spirit-in-physics`
- **Default Branch**: `main`

---

## 2. git-annex と lakeFS の統合

### 前提条件

```bash
# git-annex と rclone のインストール確認
git annex version
rclone version
```

### lakeFS を S3 リモートとして追加

```bash
cd /path/to/your/git/repo

# lakeFS S3 Gateway を git-annex remote として追加
git annex initremote lakefs \
  type=S3 \
  encryption=none \
  host=sip.junkawasaki.com \
  port=80 \
  protocol=http \
  bucket=spirit-in-physics \
  requeststyle=path \
  signature=v4 \
  exporttree=yes \
  versioning=yes \
  chunk=0
```

### 認証情報の設定

```bash
# ~/.aws/credentials に追加
cat >> ~/.aws/credentials << EOF

[lakefs]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

# git-annex に認証情報を設定
git config --local annex.lakefs.s3creds ~/.aws/credentials
git config --local annex.lakefs.s3profile lakefs
```

---

## 3. データの同期

### ローカルから lakeFS へプッシュ

```bash
# 全ファイルを lakeFS へコピー
git annex copy --to=lakefs --all

# 特定のディレクトリのみ
git annex copy dataset/ --to=lakefs
```

### lakeFS から取得

```bash
# ファイル内容を取得
git annex get --from=lakefs <file>

# 全ファイル取得
git annex get --from=lakefs --all
```

### 同期状態の確認

```bash
# ファイルの保存場所を確認
git annex whereis

# lakeFS の状態確認
git annex info lakefs
```

---

## 4. lakeFS のブランチ運用

### 実験ごとにブランチ作成

lakeFS UI または lakectl で:

```bash
# lakectl のインストール (Mac)
brew install lakefs/tap/lakectl

# lakectl の設定
lakectl config
# Server: http://sip.junkawasaki.com
# Access Key: AKIAIOSFODNN7EXAMPLE
# Secret Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# ブランチ作成
lakectl branch create \
  lakefs://spirit-in-physics/exp-2026-01-07 \
  --source lakefs://spirit-in-physics/main

# データをエクスポート (ブランチ指定)
git annex copy --to=lakefs-exp-2026-01-07
```

---

## 5. トラブルシューティング

### 認証エラー

```bash
# lakeFS の認証状態を確認
curl -u "AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
  http://sip.junkawasaki.com/api/v1/repositories
```

### S3 接続テスト

```bash
# aws CLI で lakeFS S3 Gateway をテスト
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE \
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
aws s3 ls --endpoint-url=http://sip.junkawasaki.com s3://spirit-in-physics/
```

---

## 6. DNS 設定が完了していない場合

Gateway IP (`34.104.143.141`) を直接使用:

```bash
# /etc/hosts に追加
echo "34.104.143.141 sip.junkawasaki.com" | sudo tee -a /etc/hosts

# または git-annex で直接 IP 指定
git annex initremote lakefs \
  type=S3 \
  encryption=none \
  host=34.104.143.141 \
  port=80 \
  protocol=http \
  bucket=spirit-in-physics \
  requeststyle=path
```

---

## まとめ

1. **Web UI でセットアップ** → 管理者作成 + リポジトリ作成
2. **git-annex remote 追加** → lakeFS S3 Gateway 経由
3. **データ同期** → `git annex copy --to=lakefs`
4. **バージョン管理** → lakeFS のブランチ機能を活用

この構成により、研究データに Git-like なワークフローが適用されます。

