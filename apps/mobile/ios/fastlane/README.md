fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios debug_sim

```sh
[bundle exec] fastlane ios debug_sim
```

Debug build for Simulator

### ios run_sim

```sh
[bundle exec] fastlane ios run_sim
```

Run on Simulator

### ios sync_certs

```sh
[bundle exec] fastlane ios sync_certs
```

証明書とプロファイルを同期 (match)

### ios create_certs

```sh
[bundle exec] fastlane ios create_certs
```

新しい証明書とプロファイルを作成

### ios beta

```sh
[bundle exec] fastlane ios beta
```

TestFlight にアップロード

### ios release

```sh
[bundle exec] fastlane ios release
```

App Store に提出

### ios fetch_metadata

```sh
[bundle exec] fastlane ios fetch_metadata
```

App Store メタデータをダウンロード

### ios upload_screenshots

```sh
[bundle exec] fastlane ios upload_screenshots
```

スクリーンショットをアップロード

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
