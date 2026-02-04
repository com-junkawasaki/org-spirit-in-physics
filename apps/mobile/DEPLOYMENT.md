# Spirit in Physics - モバイルアプリ配信ガイド

このドキュメントでは、iOS（App Store）と Android（Google Play）へのアプリ配信手順を説明します。

## 前提条件

### iOS
- Apple Developer Program に登録済み（$99/年）
- Xcode 15+ がインストール済み（ローカルビルドの場合）
- Ruby 3.0+ がインストール済み

### Android
- Google Play Developer アカウントに登録済み（$25 一回のみ）
- Java 17+ がインストール済み
- Ruby 3.0+ がインストール済み

## 初期セットアップ

### 1. 依存関係のインストール

```bash
# iOS
cd apps/mobile/ios
bundle install

# Android
cd apps/mobile/android
bundle install
```

### 2. iOS セットアップ

#### 2.1 Apple Developer Program 登録

1. https://developer.apple.com/programs/ にアクセス
2. Apple ID でサインイン
3. 「Enroll」をクリックして登録開始
4. 個人 or 組織を選択
5. 支払い完了後、1〜2営業日で有効化

#### 2.2 App Store Connect API Key の作成

1. https://appstoreconnect.apple.com にアクセス
2. ユーザーとアクセス → キー → App Store Connect API
3. 「+」をクリックして新しいキーを作成
4. 名前を入力し、「Admin」権限を付与
5. キーをダウンロード（`.p8` ファイル）
6. 以下の情報をメモ：
   - Key ID
   - Issuer ID
   - キーファイルの内容

#### 2.3 証明書リポジトリの作成（match用）

1. GitHub でプライベートリポジトリを作成（例: `spirit-certificates`）
2. `apps/mobile/ios/fastlane/Matchfile` を編集：
   ```ruby
   git_url("git@github.com:YOUR_USERNAME/spirit-certificates.git")
   ```

#### 2.4 証明書の初期化

```bash
cd apps/mobile/ios
bundle exec fastlane create_certs
```

#### 2.5 Appfile の設定

`apps/mobile/ios/fastlane/Appfile` を編集して、Team ID を設定：
```ruby
team_id("YOUR_TEAM_ID")  # Apple Developer ポータルで確認
itc_team_id("YOUR_ITC_TEAM_ID")  # App Store Connect で確認
```

### 3. Android セットアップ

#### 3.1 Google Play Developer 登録

1. https://play.google.com/console にアクセス
2. Google アカウントでサインイン
3. 「デベロッパーアカウントを作成」をクリック
4. $25 の登録料を支払い

#### 3.2 Google Play Console でアプリを作成

1. Google Play Console で「アプリを作成」
2. アプリ名: Spirit in Physics
3. デフォルト言語: 日本語
4. アプリまたはゲーム: アプリ
5. 無料または有料: 選択

#### 3.3 サービスアカウントの作成

1. Google Cloud Console (https://console.cloud.google.com) にアクセス
2. プロジェクトを選択または作成
3. IAM と管理 → サービスアカウント → 作成
4. サービスアカウント名を入力
5. 「キーを作成」→ JSON を選択 → ダウンロード
6. ダウンロードしたファイルを `play-store-credentials.json` として保存

#### 3.4 Google Play Console でサービスアカウントに権限を付与

1. Google Play Console → 設定 → API アクセス
2. 「Google Cloud プロジェクトをリンク」
3. サービスアカウントを招待
4. 「リリースマネージャー」権限を付与

#### 3.5 署名キーの作成

```bash
cd apps/mobile/android/app
keytool -genkey -v -keystore release.keystore -alias spirit -keyalg RSA -keysize 2048 -validity 10000
```

#### 3.6 key.properties の作成

`apps/mobile/android/key.properties` を作成：
```properties
storeFile=app/release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=spirit
keyPassword=YOUR_KEY_PASSWORD
```

#### 3.7 build.gradle の設定

`apps/mobile/android/app/build.gradle` に署名設定を追加：
```groovy
android {
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("key.properties")
            def keystoreProperties = new Properties()
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

## ローカルからの配信

### iOS - TestFlight

```bash
cd apps/mobile/ios
bundle exec fastlane beta
```

### iOS - App Store

```bash
cd apps/mobile/ios
bundle exec fastlane release
```

### Android - 内部テスト

```bash
cd apps/mobile/android
bundle exec fastlane internal
```

### Android - 本番

```bash
cd apps/mobile/android
bundle exec fastlane release
```

## GitHub Actions での自動配信

### 必要なシークレット

リポジトリの Settings → Secrets and variables → Actions で以下を設定：

#### iOS
| シークレット名 | 説明 |
|---------------|------|
| `APP_STORE_CONNECT_API_KEY_KEY_ID` | App Store Connect API Key ID |
| `APP_STORE_CONNECT_API_KEY_ISSUER_ID` | Issuer ID |
| `APP_STORE_CONNECT_API_KEY_KEY` | .p8 ファイルの内容 |
| `MATCH_PASSWORD` | match の暗号化パスワード |
| `MATCH_GIT_BASIC_AUTHORIZATION` | 証明書リポジトリのアクセストークン（Base64） |
| `KEYCHAIN_PASSWORD` | CI 用 Keychain パスワード |

#### Android
| シークレット名 | 説明 |
|---------------|------|
| `GOOGLE_PLAY_JSON_KEY` | サービスアカウント JSON の内容 |
| `ANDROID_KEYSTORE_BASE64` | release.keystore を Base64 エンコードしたもの |
| `ANDROID_KEY_ALIAS` | キーエイリアス |
| `ANDROID_KEY_PASSWORD` | キーパスワード |
| `ANDROID_STORE_PASSWORD` | キーストアパスワード |

### Base64 エンコード方法

```bash
# Keystore を Base64 エンコード
base64 -i apps/mobile/android/app/release.keystore | pbcopy
```

### 配信のトリガー

#### Git タグで配信
```bash
# iOS TestFlight
git tag ios/v1.0.0-1
git push origin ios/v1.0.0-1

# Android 内部テスト
git tag android/v1.0.0-1
git push origin android/v1.0.0-1
```

#### 手動で配信
1. GitHub リポジトリ → Actions
2. 「iOS Deploy」または「Android Deploy」を選択
3. 「Run workflow」をクリック
4. トラック/レーンを選択して実行

## トラブルシューティング

### iOS: 証明書エラー
```bash
# 証明書を再生成
bundle exec fastlane match nuke development
bundle exec fastlane match nuke distribution
bundle exec fastlane create_certs
```

### Android: 署名エラー
- `key.properties` のパスが正しいか確認
- Keystore ファイルが存在するか確認

### CI: ビルド失敗
- シークレットが正しく設定されているか確認
- 環境変数の値に改行や特殊文字が含まれていないか確認

## 関連リンク

- [fastlane ドキュメント](https://docs.fastlane.tools/)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
- [Google Play Developer API](https://developers.google.com/android-publisher)
- [Capacitor iOS](https://capacitorjs.com/docs/ios)
- [Capacitor Android](https://capacitorjs.com/docs/android)
