import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@spiritinphysics/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@spiritinphysics/components/ui/tabs'
import Link from 'next/link'
import { Button } from '@spiritinphysics/components/ui/button'

// Merkle DAG: ghosts.analysis -> ghost_patterns_page
// spirit から分析分類されたパターンのビュー

interface GhostPattern {
  id: string
  name: string
  type: 'gene' | 'meme' | 'archetype'
  description: string
  confidence: number
  wordCount: number
}

// TODO: API から実際のデータを取得する
async function getGhostPatterns(): Promise<GhostPattern[]> {
  // モックデータ - 実際の実装では API から取得
  return [
    {
      id: '1',
      name: 'Mother Archetype',
      type: 'archetype',
      description: '母性の元型パターン',
      confidence: 0.85,
      wordCount: 15
    },
    {
      id: '2',
      name: 'Shadow Archetype',
      type: 'archetype',
      description: '影の元型パターン',
      confidence: 0.72,
      wordCount: 12
    },
    {
      id: '3',
      name: 'Religion Meme',
      type: 'meme',
      description: '宗教的文化パターン',
      confidence: 0.68,
      wordCount: 10
    },
    {
      id: '4',
      name: 'Family Gene',
      type: 'gene',
      description: '家族関係の遺伝的パターン',
      confidence: 0.91,
      wordCount: 18
    }
  ]
}

export default async function GhostsPage() {
  const ghosts = await getGhostPatterns()

  const ghostsByType = {
    archetype: ghosts.filter(g => g.type === 'archetype'),
    meme: ghosts.filter(g => g.type === 'meme'),
    gene: ghosts.filter(g => g.type === 'gene')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ghost Patterns</h1>
        <p className="text-muted-foreground">
          spirit から分析分類されたパターン。遺伝的・文化的・元型的パターン（gene/meme/archetype）を可視化します。
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>概念定義</CardTitle>
          <CardDescription>
            Ghost は spirit から分析分類されたパターンです
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Ghost</strong>: スピリットから分析分類されたパターン。
              すべてのユーザーの実験データを情報空間に統合したスピリットから抽出される、遺伝的・文化的・元型的パターン（gene/meme/archetype）を含みます。
            </p>
            <p>
              <strong>Meme</strong>: ゴーストの遺伝子（gene of ghost）。
              文化的・社会的な情報伝達とパターン継承を担う基本単位です。
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">すべて ({ghosts.length})</TabsTrigger>
          <TabsTrigger value="archetype">
            アーキタイプ ({ghostsByType.archetype.length})
          </TabsTrigger>
          <TabsTrigger value="meme">ミーム ({ghostsByType.meme.length})</TabsTrigger>
          <TabsTrigger value="gene">遺伝子 ({ghostsByType.gene.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ghosts.map((ghost) => (
              <Card key={ghost.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{ghost.name}</CardTitle>
                    <span className={`px-2 py-1 rounded text-xs ${
                      ghost.type === 'archetype' ? 'bg-purple-100 text-purple-800' :
                      ghost.type === 'meme' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {ghost.type === 'archetype' ? 'アーキタイプ' :
                       ghost.type === 'meme' ? 'ミーム' : '遺伝子'}
                    </span>
                  </div>
                  <CardDescription>{ghost.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">信頼度:</span>
                      <span className="font-medium">{(ghost.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">単語数:</span>
                      <span className="font-medium">{ghost.wordCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {Object.entries(ghostsByType).map(([type, typeGhosts]) => (
          <TabsContent key={type} value={type} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeGhosts.map((ghost) => (
                <Card key={ghost.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{ghost.name}</CardTitle>
                    <CardDescription>{ghost.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">信頼度:</span>
                        <span className="font-medium">{(ghost.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">単語数:</span>
                        <span className="font-medium">{ghost.wordCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
