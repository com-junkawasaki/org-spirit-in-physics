// src/main/kotlin/com/gftdcojp/spiritinphysics/config/MinioConfig.kt
package com.gftdcojp.spiritinphysics.config

import io.minio.MinioClient
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.RestTemplate

@Configuration
class MinioConfig(
    @Value("\${minio.endpoint}") private val minioEndpoint: String,
    @Value("\${minio.access-key}") private val minioAccessKey: String,
    @Value("\${minio.secret-key}") private val minioSecretKey: String,
    @Value("\${minio.bucket.files}") private val bucketFiles: String,
    @Value("\${minio.bucket.analysis}") private val bucketAnalysis: String,
    @Value("\${minio.bucket.videos}") private val bucketVideos: String,
    @Value("\${minio.bucket.results}") private val bucketResults: String
) {

    @Bean
    fun minioClient(): MinioClient {
        return MinioClient.builder()
            .endpoint(minioEndpoint)
            .credentials(minioAccessKey, minioSecretKey)
            .build()
    }

    @Bean
    fun minioBuckets(): MinioBuckets {
        return MinioBuckets(
            files = bucketFiles,
            analysis = bucketAnalysis,
            videos = bucketVideos,
            results = bucketResults
        )
    }

    @Bean
    fun restTemplate(): RestTemplate {
        return RestTemplate()
    }
}

data class MinioBuckets(
    val files: String,
    val analysis: String,
    val videos: String,
    val results: String
)
