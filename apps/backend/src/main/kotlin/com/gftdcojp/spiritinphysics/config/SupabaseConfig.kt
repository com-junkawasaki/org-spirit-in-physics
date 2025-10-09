// src/main/kotlin/com/gftdcojp/spiritinphysics/config/SupabaseConfig.kt
package com.gftdcojp.spiritinphysics.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.web.client.RestTemplate
import javax.sql.DataSource

@Configuration
class SupabaseConfig(
    @Value("\${supabase.url}") private val supabaseUrl: String,
    @Value("\${supabase.username}") private val supabaseUsername: String,
    @Value("\${supabase.password}") private val supabasePassword: String
) {

    @Bean
    fun supabaseDataSource(): DataSource {
        val dataSource = DriverManagerDataSource()
        dataSource.setDriverClassName("org.postgresql.Driver")
        dataSource.url = supabaseUrl
        dataSource.username = supabaseUsername
        dataSource.password = supabasePassword
        return dataSource
    }

    @Bean
    fun supabaseJdbcTemplate(dataSource: DataSource): JdbcTemplate {
        return JdbcTemplate(dataSource)
    }

    @Bean
    fun restTemplate(): RestTemplate {
        return RestTemplate()
    }
}
