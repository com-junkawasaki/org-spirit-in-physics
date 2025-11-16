# TDD with JSON-LD Specifications

このプロジェクトでは、JSON-LDスキーマを仕様（spec）として使用し、Test-Driven Development（TDD）アプローチを実践しています。

## アーキテクチャ

### 1. JSON-LD仕様スキーマ

`src/schemas/demo-spec.shacl.jsonld` にSHACL制約を含むJSON-LD仕様を定義しています。

- **AnalysisStep**: 分析ステップの制約
- **WordEmotionData**: 単語-感情データの制約
- **EmotionData**: 感情データの制約
- **ComplexSpaceData**: Complex空間データの制約
- **BatchQueueItem**: バッチキューアイテムの制約
- **Configuration**: アプリケーション設定の制約

### 2. バリデーター実装

`src/lib/spec-validator.ts` にJSON-LD仕様に基づくバリデーター関数を実装しています。

```typescript
import { validateAnalysisStep, validateWordEmotionData } from './lib/spec-validator'

// 使用例
const step: AnalysisStep = { /* ... */ }
const result = validateAnalysisStep(step)
if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

### 3. テストケース

`src/lib/spec-validator.test.ts` にJSON-LD仕様に基づくテストケースを実装しています。

- **有効なデータ**: 仕様を満たすデータが正しく検証されることを確認
- **無効なデータ**: 仕様に違反するデータが適切に拒否されることを確認

## テストの実行

```bash
# テストを実行
pnpm test:run

# テストをウォッチモードで実行
pnpm test

# テストUIを起動
pnpm test:ui
```

## TDDワークフロー

1. **仕様定義**: JSON-LDスキーマにSHACL制約を追加
2. **テスト作成**: 仕様に基づくテストケースを作成
3. **実装**: バリデーター関数を実装
4. **検証**: テストを実行して仕様準拠を確認
5. **統合**: 実装コードでバリデーターを使用

## 仕様の拡張

新しいデータ型を追加する場合：

1. `src/schemas/demo-spec.shacl.jsonld` にSHACL制約を追加
2. `src/lib/spec-validator.ts` にバリデーター関数を追加
3. `src/lib/spec-validator.test.ts` にテストケースを追加
4. テストを実行して仕様準拠を確認

## 参考

- [JSON-LD Specification](https://www.w3.org/TR/json-ld/)
- [SHACL Specification](https://www.w3.org/TR/shacl/)
- [Vitest Documentation](https://vitest.dev/)

