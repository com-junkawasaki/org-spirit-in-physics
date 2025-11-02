# 旧Neo4jファイルのアーカイブ計画

## 📦 アーカイブ対象ファイル

以下のファイルは、Supabase移行完了後、使用されていないためアーカイブ可能です。

### Visualizer App
- `apps/visualizer/src/lib/neo4j.ts` - 旧Neo4jクライアント実装
- `apps/visualizer/src/lib/neogma-models.ts` - 旧Neogmaモデル定義
- `apps/visualizer/src/lib/neo4j-*.ts` - 各種Neo4jヘルパーファイル（12ファイル）
- `apps/visualizer/src/lib/workflows/neo4j-persistence-workflow.ts` - 無効化済みワークフロー

### Patient App
- `apps/patient/scripts/src/lib/neo4j.ts` - 旧Neo4jクライアント実装
- `apps/patient/scripts/src/lib/import-transaction-manager.ts` - Neo4jトランザクション管理

## ⚠️ 保持が必要なファイル

以下のファイルは後方互換性のため、一時的に保持します：

- `apps/patient/scripts/src/lib/database/neo4j-manager.ts` - エイリアスとして使用中（将来的に削除可能）

## 🗂️ アーカイブ手順

### 1. アーカイブスクリプトの実行

```bash
bash scripts/cleanup-old-files.sh
```

このスクリプトは：
- 旧ファイルを `.archive/neo4j-files-YYYYMMDD/` に移動
- READMEファイルを作成
- アーカイブ内容を記録

### 2. アーカイブ後の確認

アーカイブ後、以下を確認：
- [ ] アプリケーションが正常にビルドできる
- [ ] アプリケーションが正常に起動する
- [ ] 主要機能が正常に動作する

### 3. 完全削除（将来的に）

問題がなければ、3ヶ月後にアーカイブを完全削除可能：

```bash
rm -rf .archive/neo4j-files-*
```

## 📝 アーカイブ理由

これらのファイルは：
- 現在のコードベースで使用されていない
- 後方互換性のためのエイリアスが実装済み
- 参照されている箇所は全てSupabaseに移行済み

アーカイブすることで：
- コードベースの整理
- 混乱の防止
- 将来的な参照のため保存

## ✅ アーカイブ実行チェックリスト

- [ ] 全てのテストが成功
- [ ] アプリケーションが正常に動作
- [ ] アーカイブスクリプトを実行
- [ ] アーカイブ後の動作確認
- [ ] Gitにコミット（アーカイブを含む）

