Feature: 被験者ページ E2E テスト
  システムの被験者が自身のデータを閲覧し、認証が機能していることを確認する

  Scenario: 被験者ページの初期表示
    Given ブラウザで "http://participant.localhost/" を開く
    Then ページタイトルに "Spirit in Physics" が含まれていること
    And ログインボタンまたはサインインフォームが表示されていること

  Scenario: Connect RPC 経由のデータ取得 (E2E)
    Given ブラウザで "http://participant.localhost/" を開く
    When ページが完全に読み込まれる
    Then バックエンド API "http://api.localhost" への通信が発生していること
