// lib/minio-client.ts
import { Client } from 'minio'

const minioClient = new Client({
  endPoint: process.env.NEXT_PUBLIC_MINIO_ENDPOINT?.replace('http://', '').replace('https://', '') || 'localhost',
  port: process.env.NEXT_PUBLIC_MINIO_ENDPOINT?.includes('https') ? 443 : 9000,
  useSSL: process.env.NEXT_PUBLIC_MINIO_ENDPOINT?.startsWith('https') || false,
  accessKey: process.env.NEXT_PUBLIC_MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.NEXT_PUBLIC_MINIO_SECRET_KEY || 'minioadmin',
})

export const minioConfig = {
  endpoint: process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 'http://localhost:9000',
  accessKey: process.env.NEXT_PUBLIC_MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.NEXT_PUBLIC_MINIO_SECRET_KEY || 'minioadmin',
  bucketAnalysis: process.env.NEXT_PUBLIC_MINIO_BUCKET_ANALYSIS || 'spirit-analysis',
  bucketResults: process.env.NEXT_PUBLIC_MINIO_BUCKET_RESULTS || 'spirit-results',
}

export default minioClient

// Utility functions for analysis and report files
export const minioUtils = {
  getAnalysisUrl: async (analysisId: string, filename: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      minioClient.presignedGetObject(
        minioConfig.bucketAnalysis,
        `analysis/${analysisId}/${filename}`,
        24 * 60 * 60, // 24 hours
        (err, presignedUrl) => {
          if (err) {
            reject(err)
          } else {
            resolve(presignedUrl)
          }
        }
      )
    })
  },

  getReportUrl: async (reportId: string, filename: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      minioClient.presignedGetObject(
        minioConfig.bucketResults,
        `reports/${reportId}/${filename}`,
        24 * 60 * 60, // 24 hours
        (err, presignedUrl) => {
          if (err) {
            reject(err)
          } else {
            resolve(presignedUrl)
          }
        }
      )
    })
  },

  listAnalysisFiles: async (analysisId: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const objects: string[] = []
      const stream = minioClient.listObjects(minioConfig.bucketAnalysis, `analysis/${analysisId}/`)

      stream.on('data', (obj) => {
        objects.push(obj.name)
      })

      stream.on('error', (err) => {
        reject(err)
      })

      stream.on('end', () => {
        resolve(objects)
      })
    })
  },

  listReportFiles: async (reportId: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const objects: string[] = []
      const stream = minioClient.listObjects(minioConfig.bucketResults, `reports/${reportId}/`)

      stream.on('data', (obj) => {
        objects.push(obj.name)
      })

      stream.on('error', (err) => {
        reject(err)
      })

      stream.on('end', () => {
        resolve(objects)
      })
    })
  },

  downloadFile: async (bucket: string, objectName: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      minioClient.getObject(bucket, objectName, (err, dataStream) => {
        if (err) {
          reject(err)
          return
        }

        const chunks: Uint8Array[] = []
        dataStream.on('data', (chunk) => {
          chunks.push(chunk)
        })

        dataStream.on('end', () => {
          const blob = new Blob(chunks)
          resolve(blob)
        })

        dataStream.on('error', (err) => {
          reject(err)
        })
      })
    })
  },
}
