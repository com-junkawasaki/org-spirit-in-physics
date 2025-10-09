// Export utilities for PDF, PNG, and other formats
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import puppeteer from 'puppeteer'

export interface ExportOptions {
  format: 'pdf' | 'png' | 'jpg' | 'svg'
  quality?: number
  width?: number
  height?: number
  backgroundColor?: string
  filename?: string
}

export interface PDFOptions extends ExportOptions {
  format: 'pdf'
  orientation?: 'portrait' | 'landscape'
  unit?: 'mm' | 'cm' | 'in' | 'px'
  margin?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

/**
 * Export a DOM element to image format
 */
export async function exportToImage(
  element: HTMLElement,
  options: ExportOptions = { format: 'png' }
): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: options.backgroundColor || '#ffffff',
    width: options.width,
    height: options.height,
    scale: window.devicePixelRatio || 1,
    useCORS: true,
    allowTaint: false,
  })

  const mimeType = options.format === 'jpg' ? 'image/jpeg' : 'image/png'

  return canvas.toDataURL(mimeType, options.quality || 1.0)
}

/**
 * Export a DOM element to PDF
 */
export async function exportToPDF(
  element: HTMLElement,
  options: PDFOptions = {
    format: 'pdf',
    orientation: 'portrait',
    unit: 'mm',
    margin: { top: 10, right: 10, bottom: 10, left: 10 }
  }
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    backgroundColor: options.backgroundColor || '#ffffff',
    scale: 2, // Higher quality for PDF
    useCORS: true,
    allowTaint: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: options.unit,
    format: 'a4'
  })

  const imgWidth = 210 - options.margin!.left - options.margin!.right // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', options.margin!.left, options.margin!.top, imgWidth, imgHeight)

  return pdf.output('blob')
}

/**
 * Export multiple charts to a single PDF document
 */
export async function exportChartsToPDF(
  elements: HTMLElement[],
  options: {
    filename?: string
    title?: string
    orientation?: 'portrait' | 'landscape'
    includeMetadata?: boolean
    metadata?: Record<string, any>
  } = {}
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const pageHeight = 297
  const margin = 10
  let yPosition = margin

  // Add title if provided
  if (options.title) {
    pdf.setFontSize(16)
    pdf.text(options.title, margin, yPosition)
    yPosition += 10
  }

  // Add metadata if provided
  if (options.includeMetadata && options.metadata) {
    pdf.setFontSize(10)
    const metadataText = Object.entries(options.metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition)
    yPosition += 5
    pdf.text(metadataText, margin, yPosition)
    yPosition += 10
  }

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]

    // Check if we need a new page
    if (yPosition > pageHeight - 50) {
      pdf.addPage()
      yPosition = margin
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = pageWidth - 2 * margin
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Check if image fits on current page
    if (yPosition + imgHeight > pageHeight - margin) {
      pdf.addPage()
      yPosition = margin
    }

    pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight)
    yPosition += imgHeight + 10

    // Add page break between charts (except for the last one)
    if (i < elements.length - 1) {
      yPosition += 5
    }
  }

  return pdf.output('blob')
}

/**
 * Export chart data as CSV
 */
export function exportToCSV(
  data: any[],
  headers: string[],
  filename: string = 'export.csv'
): void {
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header] || ''
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

/**
 * Export chart data as JSON
 */
export function exportToJSON(
  data: any,
  filename: string = 'export.json'
): void {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}
