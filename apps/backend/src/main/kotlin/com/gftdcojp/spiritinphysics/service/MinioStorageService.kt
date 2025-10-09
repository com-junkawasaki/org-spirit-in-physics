// src/main/kotlin/com/gftdcojp/spiritinphysics/service/MinioStorageService.kt
package com.gftdcojp.spiritinphysics.service

import com.gftdcojp.spiritinphysics.config.MinioBuckets
import io.minio.*
import io.minio.http.Method
import org.springframework.stereotype.Service
import java.io.InputStream
import java.util.concurrent.TimeUnit

@Service
class MinioStorageService(
    private val minioClient: MinioClient,
    private val minioBuckets: MinioBuckets
) {

    fun uploadFile(bucketName: String, objectName: String, inputStream: InputStream, contentType: String? = null): String {
        try {
            // Ensure bucket exists
            ensureBucketExists(bucketName)

            val putObjectArgs = PutObjectArgs.builder()
                .bucket(bucketName)
                .`object`(objectName)
                .stream(inputStream, -1, 10485760) // 10MB part size
                .contentType(contentType ?: "application/octet-stream")
                .build()

            minioClient.putObject(putObjectArgs)

            return getObjectUrl(bucketName, objectName)
        } catch (e: Exception) {
            throw RuntimeException("Failed to upload file to MinIO: ${e.message}", e)
        }
    }

    fun downloadFile(bucketName: String, objectName: String): InputStream {
        try {
            val getObjectArgs = GetObjectArgs.builder()
                .bucket(bucketName)
                .`object`(objectName)
                .build()

            return minioClient.getObject(getObjectArgs)
        } catch (e: Exception) {
            throw RuntimeException("Failed to download file from MinIO: ${e.message}", e)
        }
    }

    fun deleteFile(bucketName: String, objectName: String) {
        try {
            val removeObjectArgs = RemoveObjectArgs.builder()
                .bucket(bucketName)
                .`object`(objectName)
                .build()

            minioClient.removeObject(removeObjectArgs)
        } catch (e: Exception) {
            throw RuntimeException("Failed to delete file from MinIO: ${e.message}", e)
        }
    }

    fun getObjectUrl(bucketName: String, objectName: String, expirySeconds: Int = 3600): String {
        try {
            return minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucketName)
                    .`object`(objectName)
                    .expiry(expirySeconds, TimeUnit.SECONDS)
                    .build()
            )
        } catch (e: Exception) {
            throw RuntimeException("Failed to generate presigned URL: ${e.message}", e)
        }
    }

    fun listFiles(bucketName: String, prefix: String? = null): List<String> {
        try {
            val objects = mutableListOf<String>()
            val listObjectsArgs = ListObjectsArgs.builder()
                .bucket(bucketName)
                .apply { prefix?.let { prefix(it) } }
                .build()

            val objectListing = minioClient.listObjects(listObjectsArgs)
            objectListing.forEach { item ->
                objects.add(item.get().objectName())
            }

            return objects
        } catch (e: Exception) {
            throw RuntimeException("Failed to list files from MinIO: ${e.message}", e)
        }
    }

    fun fileExists(bucketName: String, objectName: String): Boolean {
        try {
            val statObjectArgs = StatObjectArgs.builder()
                .bucket(bucketName)
                .`object`(objectName)
                .build()

            minioClient.statObject(statObjectArgs)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    private fun ensureBucketExists(bucketName: String) {
        try {
            val bucketExistsArgs = BucketExistsArgs.builder()
                .bucket(bucketName)
                .build()

            if (!minioClient.bucketExists(bucketExistsArgs)) {
                val makeBucketArgs = MakeBucketArgs.builder()
                    .bucket(bucketName)
                    .build()

                minioClient.makeBucket(makeBucketArgs)
            }
        } catch (e: Exception) {
            throw RuntimeException("Failed to create bucket: ${e.message}", e)
        }
    }

    // Convenience methods for specific bucket types
    fun uploadParticipantFile(participantId: String, filename: String, inputStream: InputStream, contentType: String? = null): String {
        val objectName = "participants/$participantId/$filename"
        return uploadFile(minioBuckets.files, objectName, inputStream, contentType)
    }

    fun uploadVideoFile(participantId: String, sessionId: String, filename: String, inputStream: InputStream): String {
        val objectName = "videos/$participantId/$sessionId/$filename"
        return uploadFile(minioBuckets.videos, objectName, inputStream, "video/webm")
    }

    fun uploadAnalysisResult(analysisId: String, filename: String, inputStream: InputStream): String {
        val objectName = "analysis/$analysisId/$filename"
        return uploadFile(minioBuckets.analysis, objectName, inputStream, "application/json")
    }

    fun uploadReportResult(reportId: String, filename: String, inputStream: InputStream, contentType: String = "text/markdown"): String {
        val objectName = "reports/$reportId/$filename"
        return uploadFile(minioBuckets.results, objectName, inputStream, contentType)
    }
}
