// Custom hook for chart export functionality
import { useCallback, useState } from 'react'
import { exportToImage, exportToPDF, exportChartsToPDF, exportToCSV, exportToJSON, downloadBlob } from '@/lib/export-utils'

interface ExportState {
  isExporting: boolean
  progress: number
  error: string | null
}

interface ExportMetadata {
  title?: string
  description?: string
  author?: string
  generatedAt?: string
  dataset?: string
  filters?: Record<string, any>
}

export function useChartExport() {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    error: null
  })

  const exportSingleChart = useCallback(async (
    element: HTMLElement,
    format: 'png' | 'jpg' | 'pdf',
    filename?: string,
    options?: {
      quality?: number
      backgroundColor?: string
      metadata?: ExportMetadata
    }
  ): Promise<void> => {
    setExportState({ isExporting: true, progress: 0, error: null })

    try {
      setExportState(prev => ({ ...prev, progress: 25 }))

      const baseFilename = filename || `chart_${Date.now()}`
      const finalFilename = `${baseFilename}.${format}`

      if (format === 'pdf') {
        setExportState(prev => ({ ...prev, progress: 50 }))
        const pdfBlob = await exportToPDF(element, {
          format: 'pdf',
          filename: finalFilename,
          backgroundColor: options?.backgroundColor,
          orientation: 'landscape'
        })

        setExportState(prev => ({ ...prev, progress: 75 }))

        // Add metadata if provided
        if (options?.metadata) {
          // For now, we'll just download the blob
          // In a more advanced implementation, we could modify the PDF to include metadata
          downloadBlob(pdfBlob, finalFilename)
        } else {
          downloadBlob(pdfBlob, finalFilename)
        }
      } else {
        setExportState(prev => ({ ...prev, progress: 50 }))
        const dataUrl = await exportToImage(element, {
          format,
          quality: options?.quality || 1.0,
          backgroundColor: options?.backgroundColor
        })

        setExportState(prev => ({ ...prev, progress: 75 }))

        // Create download link
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = finalFilename
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      setExportState(prev => ({ ...prev, progress: 100 }))
      setTimeout(() => {
        setExportState({ isExporting: false, progress: 0, error: null })
      }, 1000)

    } catch (error) {
      console.error('Export failed:', error)
      setExportState({
        isExporting: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Export failed'
      })
    }
  }, [])

  const exportMultipleCharts = useCallback(async (
    elements: HTMLElement[],
    format: 'pdf',
    filename?: string,
    options?: {
      title?: string
      includeMetadata?: boolean
      metadata?: ExportMetadata
      orientation?: 'portrait' | 'landscape'
    }
  ): Promise<void> => {
    if (format !== 'pdf') {
      throw new Error('Multiple chart export is only supported for PDF format')
    }

    setExportState({ isExporting: true, progress: 0, error: null })

    try {
      setExportState(prev => ({ ...prev, progress: 10 }))

      const baseFilename = filename || `charts_${Date.now()}`
      const finalFilename = `${baseFilename}.pdf`

      setExportState(prev => ({ ...prev, progress: 30 }))

      const pdfBlob = await exportChartsToPDF(elements, {
        filename: finalFilename,
        title: options?.title,
        includeMetadata: options?.includeMetadata,
        metadata: options?.metadata ? {
          title: options.title,
          description: options.metadata.description,
          author: options.metadata.author,
          generatedAt: options.metadata.generatedAt || new Date().toISOString(),
          dataset: options.metadata.dataset,
          filters: options.metadata.filters
        } : undefined
      })

      setExportState(prev => ({ ...prev, progress: 80 }))

      downloadBlob(pdfBlob, finalFilename)

      setExportState(prev => ({ ...prev, progress: 100 }))
      setTimeout(() => {
        setExportState({ isExporting: false, progress: 0, error: null })
      }, 1000)

    } catch (error) {
      console.error('Multiple chart export failed:', error)
      setExportState({
        isExporting: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Export failed'
      })
    }
  }, [])

  const exportData = useCallback((
    data: any[],
    format: 'csv' | 'json',
    filename?: string,
    headers?: string[]
  ): void => {
    try {
      const baseFilename = filename || `data_${Date.now()}`
      const finalFilename = `${baseFilename}.${format}`

      if (format === 'csv') {
        const csvHeaders = headers || (data.length > 0 ? Object.keys(data[0]) : [])
        exportToCSV(data, csvHeaders, finalFilename)
      } else {
        exportToJSON(data, finalFilename)
      }
    } catch (error) {
      console.error('Data export failed:', error)
      setExportState({
        isExporting: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Data export failed'
      })
    }
  }, [])

  const clearError = useCallback(() => {
    setExportState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    exportState,
    exportSingleChart,
    exportMultipleCharts,
    exportData,
    clearError
  }
}

export default useChartExport
