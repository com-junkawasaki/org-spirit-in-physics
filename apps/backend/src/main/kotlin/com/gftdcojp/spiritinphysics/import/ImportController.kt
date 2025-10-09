// src/main/kotlin/com/gftdcojp/spiritinphysics/import/ImportController.kt
package com.gftdcojp.spiritinphysics.import

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/admin/import")
class ImportController(
    private val importService: ImportService
) {

    @PostMapping("/participants")
    fun importParticipants(@RequestBody request: ImportRequest): ResponseEntity<Any> {
        return try {
            val results = importService.importParticipants()
            val successCount = results.filter { it["status"] == "success" }.size
            val errorCount = results.filter { it["status"] == "error" }.size

            ResponseEntity.ok(mapOf(
                "success" to true,
                "message" to "Imported ${successCount} participants successfully, ${errorCount} failed",
                "results" to results,
                "summary" to mapOf(
                    "total" to results.size,
                    "successful" to successCount,
                    "failed" to errorCount
                )
            ))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(mapOf(
                "success" to false,
                "message" to e.message,
                "results" to emptyList<Map<String, Any>>()
            ))
        }
    }

    @PostMapping("/sessions")
    fun importSessions(@RequestBody request: ImportRequest): ResponseEntity<Any> {
        return try {
            val results = importService.importSessions()
            val successCount = results.filter { it["status"] == "success" }.size
            val errorCount = results.filter { it["status"] == "error" }.size

            ResponseEntity.ok(mapOf(
                "success" to true,
                "message" to "Imported ${successCount} sessions successfully, ${errorCount} failed",
                "results" to results,
                "summary" to mapOf(
                    "total" to results.size,
                    "successful" to successCount,
                    "failed" to errorCount
                )
            ))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(mapOf(
                "success" to false,
                "message" to e.message,
                "results" to emptyList<Map<String, Any>>()
            ))
        }
    }

    @PostMapping("/emotions")
    fun importEmotions(@RequestBody request: ImportRequest): ResponseEntity<Any> {
        return try {
            val results = importService.importEmotions()
            val successCount = results.filter { it["status"] == "success" }.size
            val errorCount = results.filter { it["status"] == "error" }.size

            ResponseEntity.ok(mapOf(
                "success" to true,
                "message" to "Imported ${successCount} emotions successfully, ${errorCount} failed",
                "results" to results,
                "summary" to mapOf(
                    "total" to results.size,
                    "successful" to successCount,
                    "failed" to errorCount
                )
            ))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(mapOf(
                "success" to false,
                "message" to e.message,
                "results" to emptyList<Map<String, Any>>()
            ))
        }
    }
}

data class ImportRequest(
    val data: Any? = null
)
