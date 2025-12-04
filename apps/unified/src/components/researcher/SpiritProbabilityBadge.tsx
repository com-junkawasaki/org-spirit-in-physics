import { Badge } from './ui/badge'
import { Target } from 'lucide-react'

export function getSpiritProbabilityColor(probability: number): string {
  if (probability >= 0.9999) return 'bg-green-100 text-green-800 border-green-200'
  if (probability >= 0.999) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (probability >= 0.99) return 'bg-blue-100 text-blue-800 border-blue-200'
  if (probability >= 0.95) return 'bg-cyan-100 text-cyan-800 border-cyan-200'
  if (probability >= 0.90) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  if (probability >= 0.80) return 'bg-orange-100 text-orange-800 border-orange-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

export function SpiritProbabilityBadge({ probability }: { probability: number }) {
  return (
    <Badge className={`${getSpiritProbabilityColor(probability)} border`}>
      <Target className="h-3 w-3 mr-1" />
      {(probability * 100).toFixed(4)}%
    </Badge>
  )
}


