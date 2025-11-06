import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@spiritinphysics/components/ui/card'
import Link from 'next/link'
import { Button } from '@spiritinphysics/components/ui/button'
import { ArrowLeft } from 'lucide-react'

// Merkle DAG: archetypes.analysis -> jung_archetypes_page
// ユングの原型パターン化された spirit のビュー

interface Archetype {
  id: string
  name: string
  nameEn: string
  description: string
  spiritCount: number
  averageConfidence: number
  keywords: string[]
}

// TODO: API から実際のデータを取得する
async function getArchetypes(): Promise<Archetype[]> {
  // resources/ghost-patterns.jsonld の archetypes を参照
  return [
    {
      id: 'mother',
      name: '母',
      nameEn: 'Mother',
      description: '母性の元型 - 保護、慈愛、育成の象徴',
      spiritCount: 12,
      averageConfidence: 0.85,
      keywords: ['母親', '母', '保護', '慈愛', '育成', '母性']
    },
    {
      id: 'shadow',
      name: '影',
      nameEn: 'Shadow',
      description: '影の元型 - 否定的・抑圧された側面',
      spiritCount: 15,
      averageConfidence: 0.72,
      keywords: ['影', '闇', '否定的', '抑圧', '暗い', '悪', '恐怖']
    },
    {
      id: 'anima',
      name: 'アニマ',
      nameEn: 'Anima',
      description: 'アニマ - 男性の内的女性的側面',
      spiritCount: 8,
      averageConfidence: 0.68,
      keywords: ['アニマ', '女性的', '感情', '無意識']
    },
    {
      id: 'animus',
      name: 'アニムス',
      nameEn: 'Animus',
      description: 'アニムス - 女性の内的男性的側面',
      spiritCount: 7,
      averageConfidence: 0.65,
      keywords: ['アニムス', '男性的', '理性', '論理']
    },
    {
      id: 'self',
      name: '自己',
      nameEn: 'Self',
      description: '自己 - 完全性と統合の元型',
      spiritCount: 10,
      averageConfidence: 0.78,
      keywords: ['自己', '統合', '完全', '全体性']
    },
    {
      id: 'persona',
      name: 'ペルソナ',
      nameEn: 'Persona',
      description: 'ペルソナ - 社会的に演じる仮面',
      spiritCount: 14,
      averageConfidence: 0.71,
      keywords: ['ペルソナ', '仮面', '社会的', '役割']
    },
    {
      id: 'wiseman',
      name: '賢者',
      nameEn: 'Wise Man',
      description: '賢者 - 知恵と指導の元型',
      spiritCount: 9,
      averageConfidence: 0.74,
      keywords: ['賢者', '知恵', '指導', '教師']
    },
    {
      id: 'trickster',
      name: 'トリックスター',
      nameEn: 'Trickster',
      description: 'トリックスター - 混沌と変化の元型',
      spiritCount: 11,
      averageConfidence: 0.69,
      keywords: ['トリックスター', '混沌', '変化', 'いたずら']
    },
    {
      id: 'hero',
      name: '英雄',
      nameEn: 'Hero',
      description: '英雄 - 冒険と勝利の元型',
      spiritCount: 13,
      averageConfidence: 0.76,
      keywords: ['英雄', '冒険', '勝利', '勇者']
    },
    {
      id: 'greatmother',
      name: '大母',
      nameEn: 'Great Mother',
      description: '大母 - 創造と破壊の両面を持つ母性',
      spiritCount: 6,
      averageConfidence: 0.81,
      keywords: ['大母', '創造', '破壊', '生成']
    }
  ]
}

export default async function ArchetypesPage() {
  const archetypes = await getArchetypes()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">アーキタイプ（Archetypes）</h1>
        <p className="text-muted-foreground">
          ユングの原型理論に基づく、スピリットからパターン化された普遍的原型。
          個人を超えた集合的無意識に共通する元型的パターンを可視化します。
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>概念定義</CardTitle>
          <CardDescription>
            アーキタイプはユングの原型パターン化されたスピリットです
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Archetype</strong>: ユングの原型理論に基づく、スピリットからパターン化された普遍的原型。
              個人を超えた集合的無意識に共通する元型的パターンを表現します。
            </p>
            <p>
              <strong>Spirit</strong>: 社会や外部環境、他者に開かれた開放系の情報空間。
              アーキタイプは、この開放系の情報空間から原型としてパターン化された普遍的なパターンです。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {archetypes.map((archetype) => (
          <Card key={archetype.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{archetype.name}</span>
                <span className="text-sm text-muted-foreground font-normal">
                  {archetype.nameEn}
                </span>
              </CardTitle>
              <CardDescription>{archetype.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">関連 Spirit 数:</span>
                  <span className="font-medium">{archetype.spiritCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">平均信頼度:</span>
                  <span className="font-medium">
                    {(archetype.averageConfidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">関連キーワード:</p>
                  <div className="flex flex-wrap gap-1">
                    {archetype.keywords.slice(0, 4).map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2 py-1 bg-muted rounded text-xs"
                      >
                        {keyword}
                      </span>
                    ))}
                    {archetype.keywords.length > 4 && (
                      <span className="px-2 py-1 text-muted-foreground text-xs">
                        +{archetype.keywords.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
