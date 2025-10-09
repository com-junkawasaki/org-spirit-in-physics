'use client'

import React, { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Download, ZoomIn, ZoomOut, RotateCcw, BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react'
import { exportToImage, exportToPDF, exportToCSV, exportToJSON } from '@/lib/export-utils'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading chart...</div>
}) as any

interface AnalysisData {
  id: string
  participantId: string
  timestamp: number
  kawasakiPValue: number
  word2vecComponent: number
  reactionTimeComponent: number
  skinPotentialComponent: number
  emotionComponent: number
  emotionData: Record<string, any>
  physiologicalData: Record<string, any>
}

interface InteractiveAnalysisChartProps {
  data: AnalysisData[]
  participantId?: string
  title?: string
  width?: number
  height?: number
  onExport?: (format: string) => void
}

type ChartType = 'scatter' | '3d-scatter' | 'heatmap' | 'correlation' | 'timeseries' | 'radar'
type ViewMode = 'overview' | 'detailed' | 'comparison'

export function InteractiveAnalysisChart({
  data,
  participantId,
  title = "Interactive Analysis",
  width = 800,
  height = 600,
  onExport
}: InteractiveAnalysisChartProps) {
  const [chartType, setChartType] = useState<ChartType>('scatter')
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedPoints, setSelectedPoints] = useState<number[]>([])
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showOutliers, setShowOutliers] = useState(false)

  // Filter and process data
  const processedData = useMemo(() => {
    let filtered = data

    // Apply filters based on view mode
    if (viewMode === 'detailed' && participantId) {
      filtered = data.filter(d => d.participantId === participantId)
    }

    // Remove outliers if requested
    if (!showOutliers) {
      const pValueStats = calculateStats(filtered.map(d => d.kawasakiPValue))
      const threshold = 2 // 2 standard deviations
      filtered = filtered.filter(d =>
        Math.abs(d.kawasakiPValue - pValueStats.mean) <= threshold * pValueStats.std
      )
    }

    return filtered
  }, [data, participantId, viewMode, showOutliers])

  // Calculate statistics for outlier detection
  const calculateStats = (values: number[]) => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const std = Math.sqrt(variance)
    return { mean, std, min: Math.min(...values), max: Math.max(...values) }
  }

  // Generate plot data based on chart type
  const plotData = useMemo(() => {
    const baseData = processedData.map(d => ({
      x: d.word2vecComponent,
      y: d.reactionTimeComponent,
      z: d.skinPotentialComponent,
      value: d.kawasakiPValue,
      participantId: d.participantId,
      timestamp: d.timestamp,
      text: `P-value: ${d.kawasakiPValue.toFixed(4)}<br>Participant: ${d.participantId}<br>Time: ${new Date(d.timestamp).toLocaleString()}`
    }))

    switch (chartType) {
      case 'scatter':
        return [{
          x: baseData.map(d => d.x),
          y: baseData.map(d => d.y),
          mode: 'markers',
          type: 'scatter',
          name: 'Analysis Points',
          marker: {
            size: 8,
            color: baseData.map(d => d.value),
            colorscale: 'Viridis',
            showscale: true,
            colorbar: {
              title: 'Kawasaki P-Value',
              titleside: 'right'
            }
          },
          text: baseData.map(d => d.text),
          hovertemplate: '%{text}<extra></extra>'
        }]

      case '3d-scatter':
        return [{
          x: baseData.map(d => d.x),
          y: baseData.map(d => d.y),
          z: baseData.map(d => d.z),
          mode: 'markers',
          type: 'scatter3d',
          name: '3D Analysis',
          marker: {
            size: 5,
            color: baseData.map(d => d.value),
            colorscale: 'Viridis',
            showscale: true,
            colorbar: {
              title: 'Kawasaki P-Value',
              titleside: 'right'
            }
          },
          text: baseData.map(d => d.text),
          hovertemplate: '%{text}<extra></extra>'
        }]

      case 'heatmap':
        // Create 2D histogram
        const xBins = 20
        const yBins = 20
        const xMin = Math.min(...baseData.map(d => d.x))
        const xMax = Math.max(...baseData.map(d => d.x))
        const yMin = Math.min(...baseData.map(d => d.y))
        const yMax = Math.max(...baseData.map(d => d.y))

        const heatmap = Array(yBins).fill(0).map(() => Array(xBins).fill(0))

        baseData.forEach(d => {
          const xBin = Math.floor((d.x - xMin) / (xMax - xMin) * xBins)
          const yBin = Math.floor((d.y - yMin) / (yMax - yMin) * yBins)
          if (xBin >= 0 && xBin < xBins && yBin >= 0 && yBin < yBins) {
            heatmap[yBin][xBin] += 1
          }
        })

        return [{
          z: heatmap,
          type: 'heatmap',
          colorscale: 'Viridis',
          name: 'Density Heatmap'
        }]

      case 'correlation':
        const correlations = calculateCorrelations(processedData)
        return [{
          x: ['Word2Vec', 'Reaction Time', 'Skin Potential', 'Emotion'],
          y: [correlations.word2vec, correlations.reactionTime, correlations.skinPotential, correlations.emotion],
          type: 'bar',
          name: 'Component Correlations',
          marker: { color: 'rgb(55, 83, 109)' }
        }]

      case 'timeseries':
        const timeSeries = processedData
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(d => ({
            x: d.timestamp,
            y: d.kawasakiPValue,
            participantId: d.participantId
          }))

        return [{
          x: timeSeries.map(d => d.x),
          y: timeSeries.map(d => d.y),
          mode: 'lines+markers',
          type: 'scatter',
          name: 'P-Value Over Time',
          line: { color: 'rgb(55, 83, 109)' }
        }]

      case 'radar':
        const avgComponents = {
          word2vec: processedData.reduce((sum, d) => sum + d.word2vecComponent, 0) / processedData.length,
          reactionTime: processedData.reduce((sum, d) => sum + d.reactionTimeComponent, 0) / processedData.length,
          skinPotential: processedData.reduce((sum, d) => sum + d.skinPotentialComponent, 0) / processedData.length,
          emotion: processedData.reduce((sum, d) => sum + d.emotionComponent, 0) / processedData.length
        }

        return [{
          type: 'scatterpolar',
          r: [avgComponents.word2vec, avgComponents.reactionTime, avgComponents.skinPotential, avgComponents.emotion],
          theta: ['Word2Vec', 'Reaction Time', 'Skin Potential', 'Emotion'],
          fill: 'toself',
          name: 'Average Components'
        }]

      default:
        return []
    }
  }, [processedData, chartType])

  // Calculate correlations between components and P-value
  const calculateCorrelations = (data: AnalysisData[]) => {
    const calculateCorrelation = (x: number[], y: number[]): number => {
      const n = x.length
      const sumX = x.reduce((a, b) => a + b, 0)
      const sumY = y.reduce((a, b) => a + b, 0)
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
      const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

      const numerator = n * sumXY - sumX * sumY
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

      return denominator === 0 ? 0 : numerator / denominator
    }

    const pValues = data.map(d => d.kawasakiPValue)
    const word2vec = data.map(d => d.word2vecComponent)
    const reactionTime = data.map(d => d.reactionTimeComponent)
    const skinPotential = data.map(d => d.skinPotentialComponent)
    const emotion = data.map(d => d.emotionComponent)

    return {
      word2vec: Math.abs(calculateCorrelation(word2vec, pValues)),
      reactionTime: Math.abs(calculateCorrelation(reactionTime, pValues)),
      skinPotential: Math.abs(calculateCorrelation(skinPotential, pValues)),
      emotion: Math.abs(calculateCorrelation(emotion, pValues))
    }
  }

  // Plot layout configuration
  const layout = useMemo(() => {
    const baseLayout = {
      title: {
        text: `${title} - ${chartType.replace('-', ' ').toUpperCase()}`,
        font: { size: 16 }
      },
      width: width * zoomLevel,
      height: height * zoomLevel,
      margin: { l: 50, r: 50, t: 50, b: 50 },
      showlegend: true,
      hovermode: 'closest'
    }

    switch (chartType) {
      case 'scatter':
        return {
          ...baseLayout,
          xaxis: { title: 'Word2Vec Component' },
          yaxis: { title: 'Reaction Time Component' }
        }
      case '3d-scatter':
        return {
          ...baseLayout,
          scene: {
            xaxis: { title: 'Word2Vec Component' },
            yaxis: { title: 'Reaction Time Component' },
            zaxis: { title: 'Skin Potential Component' }
          }
        }
      case 'heatmap':
        return {
          ...baseLayout,
          xaxis: { title: 'Word2Vec Component' },
          yaxis: { title: 'Reaction Time Component' }
        }
      case 'correlation':
        return {
          ...baseLayout,
          xaxis: { title: 'Components' },
          yaxis: { title: 'Correlation Strength' }
        }
      case 'timeseries':
        return {
          ...baseLayout,
          xaxis: { title: 'Time', type: 'date' },
          yaxis: { title: 'Kawasaki P-Value' }
        }
      case 'radar':
        return {
          ...baseLayout,
          polar: {
            radialaxis: { visible: true, range: [-1, 1] }
          }
        }
      default:
        return baseLayout
    }
  }, [chartType, title, width, height, zoomLevel])

  // Handle point selection
  const handlePlotClick = useCallback((eventData: any) => {
    if (eventData.points && eventData.points.length > 0) {
      const pointIndex = eventData.points[0].pointIndex
      setSelectedPoints(prev =>
        prev.includes(pointIndex)
          ? prev.filter(i => i !== pointIndex)
          : [...prev, pointIndex]
      )
    }
  }, [])

  // Export handlers
  const handleExport = useCallback(async (format: string) => {
    const chartElement = document.querySelector('.js-plotly-plot') as HTMLElement
    if (!chartElement) return

    try {
      switch (format) {
        case 'png':
          const pngDataUrl = await exportToImage(chartElement, { format: 'png', quality: 1.0 })
          const pngLink = document.createElement('a')
          pngLink.href = pngDataUrl
          pngLink.download = `${title.replace(/\s+/g, '_')}.png`
          pngLink.click()
          break

        case 'pdf':
          const pdfBlob = await exportToPDF(chartElement, {
            format: 'pdf',
            orientation: width > height ? 'landscape' : 'portrait'
          })
          const pdfUrl = URL.createObjectURL(pdfBlob)
          const pdfLink = document.createElement('a')
          pdfLink.href = pdfUrl
          pdfLink.download = `${title.replace(/\s+/g, '_')}.pdf`
          pdfLink.click()
          URL.revokeObjectURL(pdfUrl)
          break

        case 'csv':
          exportToCSV(processedData, [
            'id', 'participantId', 'timestamp', 'kawasakiPValue',
            'word2vecComponent', 'reactionTimeComponent',
            'skinPotentialComponent', 'emotionComponent'
          ], `${title.replace(/\s+/g, '_')}.csv`)
          break

        case 'json':
          exportToJSON(processedData, `${title.replace(/\s+/g, '_')}.json`)
          break
      }

      onExport?.(format)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }, [processedData, title, width, height, onExport])

  const stats = useMemo(() => calculateStats(processedData.map(d => d.kawasakiPValue)), [processedData])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{processedData.length} points</Badge>
            <Badge variant="outline">Mean: {stats.mean.toFixed(4)}</Badge>
            <Badge variant="outline">Std: {stats.std.toFixed(4)}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scatter">2D Scatter</SelectItem>
              <SelectItem value="3d-scatter">3D Scatter</SelectItem>
              <SelectItem value="heatmap">Heatmap</SelectItem>
              <SelectItem value="correlation">Correlation</SelectItem>
              <SelectItem value="timeseries">Time Series</SelectItem>
              <SelectItem value="radar">Radar Chart</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel(Math.min(zoomLevel * 1.2, 3))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel(Math.max(zoomLevel * 0.8, 0.5))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setZoomLevel(1)
              setSelectedPoints([])
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOutliers(!showOutliers)}
          >
            <Activity className="h-4 w-4" />
            {showOutliers ? 'Hide' : 'Show'} Outliers
          </Button>
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('png')}>
            <Download className="h-4 w-4 mr-1" />
            PNG
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4 mr-1" />
            JSON
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative">
          {plotData.length > 0 && (
            <Plot
              data={plotData}
              layout={layout}
              onClick={handlePlotClick}
              config={{
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d', 'autoScale2d'],
                responsive: true
              }}
              style={{ width: '100%', height: height }}
              className="js-plotly-plot"
            />
          )}

          {selectedPoints.length > 0 && (
            <div className="absolute top-2 left-2 bg-white border rounded-lg shadow-lg p-3 max-w-xs">
              <h4 className="font-medium mb-2">Selected Points: {selectedPoints.length}</h4>
              <div className="text-sm text-gray-600">
                {selectedPoints.slice(0, 3).map(index => (
                  <div key={index}>
                    Point {index + 1}: P-value = {processedData[index]?.kawasakiPValue.toFixed(4)}
                  </div>
                ))}
                {selectedPoints.length > 3 && (
                  <div className="text-gray-500">...and {selectedPoints.length - 3} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default InteractiveAnalysisChart
