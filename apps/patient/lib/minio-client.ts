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
  bucketFiles: process.env.NEXT_PUBLIC_MINIO_BUCKET_FILES || 'spirit-files',
  bucketVideos: process.env.NEXT_PUBLIC_MINIO_BUCKET_VIDEOS || 'spirit-videos',
}

export default minioClient

// Utility functions for file operations
export const minioUtils = {
  getPresignedUrl: async (bucket: string, objectName: string, expirySeconds: number = 3600): Promise<string> => {
    return new Promise((resolve, reject) => {
      minioClient.presignedGetObject(bucket, objectName, expirySeconds, (err, presignedUrl) => {
        if (err) {
          reject(err)
        } else {
          resolve(presignedUrl)
        }
      })
    })
  },

  uploadFile: async (bucket: string, objectName: string, file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const metaData = {
        'Content-Type': file.type,
      }

      minioClient.putObject(bucket, objectName, file.stream(), file.size, metaData, (err, etag) => {
        if (err) {
          reject(err)
        } else {
          resolve(`/api/files/${bucket}/${objectName}`)
        }
      })
    })
  },

  listFiles: async (bucket: string, prefix?: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const objects: string[] = []
      const stream = minioClient.listObjects(bucket, prefix)

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

  deleteFile: async (bucket: string, objectName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      minioClient.removeObject(bucket, objectName, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  },
}
