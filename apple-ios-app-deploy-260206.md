# iOS App Store デプロイ記録 (2025-02-06)

## 概要

Spirit in Physics iOS アプリ（Capacitor ベース）を App Store に初回提出するまでの手順と遭遇したエラー・解決策の記録。

---

## 1. 環境準備

### Ruby 環境

macOS のシステム Ruby (2.6) では bundler のバージョン不一致が発生する。Homebrew Ruby を使用する。

```bash
# Homebrew Ruby をインストール
brew install ruby

# PATH を設定（.zshrc に追加推奨）
export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"

# UTF-8 ロケール（CocoaPods が必要）
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# 確認
ruby --version  # 3.4.x
gem --version
bundle --version
```

### Fastlane セットアップ

```bash
cd apps/mobile/ios

# bundler でインストール
bundle install

# 確認
bundle exec fastlane --version
```

### App Store Connect API キー

1. App Store Connect → ユーザとアクセス → キー → App Store Connect API
2. キーを生成してダウンロード (.p8 ファイル)
3. キーを配置:

```bash
mkdir -p ~/.appstoreconnect/private_keys/
cp AuthKey_62BW4Q57AB.p8 ~/.appstoreconnect/private_keys/
```

- **Key ID**: `62BW4Q57AB`
- **Issuer ID**: `69a6de81-326a-47e3-e053-5b8c7c11a4d1`

---

## 2. Xcode プロジェクト設定

### iPhone のみに変更

iPad 対応を外すため、`project.pbxproj` の `TARGETED_DEVICE_FAMILY` を変更:

```
# 変更前
TARGETED_DEVICE_FAMILY = "1,2";  # iPhone + iPad

# 変更後
TARGETED_DEVICE_FAMILY = 1;  # iPhone のみ
```

> **理由**: iPad をサポートすると iPad 用スクリーンショットが必要になり、提出が複雑になる。

### Info.plist 必須キー

以下のキーが App Store 提出時に必要:

```xml
<!-- 暗号化コンプライアンス（使用しない場合） -->
<key>ITSAppUsesNonExemptEncryption</key>
<false/>

<!-- マイクロフォン使用理由 -->
<key>NSMicrophoneUsageDescription</key>
<string>This app uses the microphone to record your voice responses during the word association experiment.</string>

<!-- カメラ使用理由 -->
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to capture facial expressions during the experiment for emotion analysis.</string>

<!-- フォトライブラリ使用理由 -->
<key>NSPhotoLibraryUsageDescription</key>
<string>This app accesses the photo library to save or select images for your profile and experiment records.</string>
```

---

## 3. ビルド & TestFlight アップロード

### Fastlane `beta` レーン実行

```bash
cd apps/mobile/ios
bundle exec fastlane beta
```

この `beta` レーンが行うこと:
1. Web アプリをビルド (`pnpm build`)
2. Capacitor copy (`npx cap copy ios`)
3. CocoaPods インストール
4. 証明書取得 (match appstore readonly)
5. ビルド番号インクリメント
6. Xcode Archive & Export (.ipa)
7. TestFlight にアップロード

### 遭遇したエラーと解決

#### エラー: Bundler バージョン不一致
```
Could not find 'bundler' (2.6.5) required by your Gemfile.lock
```
**解決**: システム Ruby ではなく Homebrew Ruby を使用。PATH を設定。

#### エラー: UTF-8 ロケール
```
CocoaPods requires your terminal to be using UTF-8 encoding
```
**解決**: `export LANG=en_US.UTF-8 && export LC_ALL=en_US.UTF-8`

#### エラー: Non-interactive モード
Fastlane がインタラクティブ入力を要求してハングする場合:
```bash
export FASTLANE_NON_INTERACTIVE=1
```

### ビルド処理の確認

TestFlight にアップロード後、Apple の処理に数分かかる。App Store Connect の TestFlight ページで:
- 🟡 処理中 → 待機
- ✅ 終了 → 審査提出可能

---

## 4. App Store 提出前の設定

### 4.1 contentRightsDeclaration の設定

**重要**: これは**アプリレベル**の属性であり、バージョンレベルではない。

```bash
# ❌ 間違い（appStoreVersions に対して設定 → ENTITY_ERROR.ATTRIBUTE.UNKNOWN）
curl -X PATCH "https://api.appstoreconnect.apple.com/v1/appStoreVersions/{versionId}" ...

# ✅ 正しい（apps に対して設定）
curl -X PATCH "https://api.appstoreconnect.apple.com/v1/apps/6758669071" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "type": "apps",
      "id": "6758669071",
      "attributes": {
        "contentRightsDeclaration": "DOES_NOT_USE_THIRD_PARTY_CONTENT"
      }
    }
  }'
```

### 4.2 価格設定

App Store Connect → アプリ → 価格および配信状況 → 価格 → $0.00 (無料) を選択。

### 4.3 年齢制限

App Store Connect API で設定:

```bash
# 年齢制限情報を取得
curl "https://api.appstoreconnect.apple.com/v1/ageRatingDeclarations/{id}" \
  -H "Authorization: Bearer $JWT_TOKEN"

# すべて NONE に設定 → 4+ レーティング
curl -X PATCH "https://api.appstoreconnect.apple.com/v1/ageRatingDeclarations/{id}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "type": "ageRatingDeclarations",
      "id": "{id}",
      "attributes": {
        "gamblingAndContests": "NONE",
        "horrorOrFearThemes": "NONE",
        "matureOrSuggestiveThemes": "NONE",
        "medicalOrTreatmentInformation": "NONE",
        "profanityOrCrudeHumor": "NONE",
        "sexualContentGraphicAndNudity": "NONE",
        "sexualContentOrNudity": "NONE",
        "violenceCartoonOrFantasy": "NONE",
        "violenceRealistic": "NONE",
        "violenceRealisticProlongedGraphicOrSadistic": "NONE",
        "alcoholTobaccoOrDrugUseOrReferences": "NONE",
        "gambling": false,
        "unrestrictedWebAccess": false,
        "seventeenPlus": false
      }
    }
  }'
```

### 4.4 App プライバシー設定（最重要）

**これが最もハマったポイント。** App Store Connect の UI で手動設定が必要。

#### 手順

1. App Store Connect → アプリ → App のプライバシー
2. 「はじめに」をクリック
3. 「はい、このアプリからデータを収集します」を選択
4. 以下の 6 つのデータタイプを選択:
   - **名前** (Name)
   - **メールアドレス** (Email)
   - **写真またはビデオ** (Photos/Videos)
   - **オーディオデータ** (Audio Data)
   - **ユーザ ID** (User ID)
   - **製品の操作** (Product Interaction)

5. 各データタイプに対して:
   - **収集の目的**: アプリの機能、アナリティクス
   - **ユーザの ID に関連づけますか？**: はい
   - **トラッキングに使用しますか？**: いいえ

6. **⚠️ 重要: 「公開」ボタンをクリック**
   - プライバシー情報を入力しただけでは不十分
   - ページ上部の「公開」ボタンを必ずクリックする
   - これをしないと「審査用に追加できません」エラーが出る

---

## 5. App Store 審査に提出

### Fastlane で提出（理想的な場合）

```bash
bundle exec fastlane submit_for_review
```

### 手動で提出（Fastlane が失敗した場合）

1. App Store Connect → アプリ → App Store タブ
2. 「審査用に追加」ドロップダウン → バージョンを選択
3. ビルドが表示されることを確認
4. 「審査へ提出」をクリック
5. 確認ダイアログで「完了」

### 遭遇したエラーと解決

#### エラー: `contentRightsDeclaration` missing
```
The provided entity is missing a required attribute -
You must provide a value for the attribute 'contentRightsDeclaration' with this request
```
**解決**: `/v1/apps/{appId}` に対して PATCH で設定（セクション 4.1 参照）

#### エラー: `appStoreVersions not in valid state`
```
appStoreVersions with id 'xxx' is not in valid state. - This resource cannot be reviewed
```
**解決**: App プライバシー情報の設定が不足。セクション 4.4 の手順でプライバシーを設定し**公開**する。

#### エラー: 「審査用に追加できません」
```
このアプリでは、追加の設定が必要です。
```
**解決**: プライバシー情報の「公開」ボタンがクリックされていなかった。公開後に解決。

---

## 6. 提出後

- **審査期間**: 通常 24〜48 時間
- **リリース設定**: 手動リリース（承認後に自分でリリースボタンを押す）
- **Build 提出**: 1.0 (15) - 2025年2月6日

---

## 7. Fastlane レーン一覧

| レーン | 説明 |
|--------|------|
| `debug_sim` | シミュレータ用デバッグビルド |
| `run_sim` | シミュレータで実行 |
| `sync_certs` | 証明書・プロファイル同期 (readonly) |
| `create_certs` | 新規証明書・プロファイル作成 |
| `beta` | TestFlight アップロード |
| `release` | App Store アップロード（審査提出なし） |
| `submit_for_review` | ビルド済みの場合の審査提出 |
| `full_release` | ビルド + アップロード + 審査提出 |
| `fetch_metadata` | メタデータダウンロード |
| `upload_metadata` | メタデータアップロード |
| `upload_screenshots` | スクリーンショットアップロード |

---

## 8. 次回リリース時の手順（チェックリスト）

1. [ ] Web アプリの変更をコミット
2. [ ] `cd apps/mobile/ios`
3. [ ] 環境変数を設定 (PATH, LANG, LC_ALL)
4. [ ] `bundle exec fastlane beta` (TestFlight アップロード)
5. [ ] App Store Connect で処理完了を確認
6. [ ] `bundle exec fastlane submit_for_review` (審査提出)
7. [ ] 審査通過後、手動でリリース

### バージョン番号の更新

- **ビルド番号** (`CFBundleVersion`): `fastlane beta` が自動インクリメント
- **バージョン番号** (`MARKETING_VERSION`): Xcode プロジェクトで手動変更 (例: 1.0 → 1.1)
