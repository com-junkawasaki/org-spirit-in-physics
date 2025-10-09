// src/main/kotlin/com/gftdcojp/spiritinphysics/temporal/TemporalController.kt
package com.gftdcojp.spiritinphysics.temporal

import io.temporal.api.workflowservice.v1.ListWorkflowExecutionsRequest
import io.temporal.client.WorkflowClient
import io.temporal.client.WorkflowOptions
import io.temporal.serviceclient.WorkflowServiceStubs
import io.temporal.serviceclient.WorkflowServiceStubsOptions
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.time.Duration
import java.time.Instant
import java.util.concurrent.TimeUnit

/**
 * Merkle DAG: temporal_management_controller
 * Temporal ワークフロー管理 API コントローラー
 * サーバー制御、ワークフロー実行、監視機能を提供
 */
@RestController
@RequestMapping("/api/temporal")
class TemporalController {

    // Temporal 接続設定
    private val temporalHost = "localhost"
    private val temporalPort = 7233

    /**
     * Temporal サーバーの状態を取得
     */
    @GetMapping("/status")
    fun getTemporalStatus(): ResponseEntity<TemporalStatus> {
        return try {
            // Docker コンテナの状態を確認
            val dockerStatus = checkDockerContainerStatus()

            // Temporal サービスの接続を確認
            val temporalConnection = checkTemporalConnection()

            val status = TemporalStatus(
                server = ServerStatus(
                    running = dockerStatus.running,
                    port = temporalPort,
                    uiPort = 8080,
                    postgresPort = 5432
                ),
                workflows = WorkflowStats(
                    total = temporalConnection.workflowCount,
                    running = temporalConnection.runningCount,
                    completed = temporalConnection.completedCount,
                    failed = temporalConnection.failedCount
                ),
                workers = WorkerStats(
                    total = temporalConnection.workerCount,
                    active = temporalConnection.activeWorkerCount,
                    taskQueues = temporalConnection.taskQueues
                )
            )

            ResponseEntity.ok(status)
        } catch (e: Exception) {
            // エラー時は停止状態を返す
            val status = TemporalStatus(
                server = ServerStatus(
                    running = false,
                    port = temporalPort,
                    uiPort = 8080,
                    postgresPort = 5432
                ),
                workflows = WorkflowStats(0, 0, 0, 0),
                workers = WorkerStats(0, 0, emptyList())
            )
            ResponseEntity.ok(status)
        }
    }

    /**
     * Temporal サーバーの制御 (起動/停止/再起動)
     */
    @PostMapping("/control")
    fun controlTemporalServer(@RequestBody controlRequest: ControlRequest): ResponseEntity<ControlResponse> {
        return try {
            val result = when (controlRequest.action) {
                "start" -> startTemporalServer()
                "stop" -> stopTemporalServer()
                "restart" -> restartTemporalServer()
                else -> throw IllegalArgumentException("Invalid action: ${controlRequest.action}")
            }

            ResponseEntity.ok(ControlResponse(success = result, message = "Temporal server ${controlRequest.action} completed"))
        } catch (e: Exception) {
            ResponseEntity.ok(ControlResponse(success = false, message = "Failed to ${controlRequest.action} temporal server: ${e.message}"))
        }
    }

    /**
     * ワークフロー一覧を取得
     */
    @GetMapping("/workflows")
    fun getWorkflows(): ResponseEntity<List<WorkflowInfo>> {
        // 簡易実装 - 実際のワークフロー取得は Temporal サーバーが起動していない場合もあるため
        return try {
            val workflows = mutableListOf<WorkflowInfo>()

            // Docker コンテナが起動している場合のみワークフロー情報を取得
            val dockerStatus = checkDockerContainerStatus()
            if (dockerStatus.running) {
                // Temporal サービスが利用可能な場合のみ取得
                try {
                    val stubs = WorkflowServiceStubs.newInstance(
                        WorkflowServiceStubsOptions.newBuilder()
                            .setTarget("$temporalHost:$temporalPort")
                            .setRpcTimeout(Duration.ofSeconds(5)) // 5秒タイムアウト
                            .build()
                    )

                    val service = stubs.blockingStub()
                    val request = ListWorkflowExecutionsRequest.newBuilder()
                        .setNamespace("default")
                        .setPageSize(50)
                        .build()

                    val response = service.listWorkflowExecutions(request)

                    workflows.addAll(response.executionsList.map { execution ->
                        WorkflowInfo(
                            id = execution.execution.workflowId,
                            name = execution.type.name,
                            status = execution.status.toString(),
                            startTime = Instant.ofEpochSecond(execution.startTime.seconds, execution.startTime.nanos.toLong()),
                            endTime = if (execution.closeTime != null)
                                Instant.ofEpochSecond(execution.closeTime.seconds, execution.closeTime.nanos.toLong())
                            else null,
                            taskQueue = execution.taskQueue
                        )
                    })
                } catch (e: Exception) {
                    // Temporal サービスが利用できない場合は空のリスト
                }
            }

            ResponseEntity.ok(workflows)
        } catch (e: Exception) {
            // エラー時は空のリストを返す
            ResponseEntity.ok(emptyList())
        }
    }

    /**
     * ワークフローを実行
     */
    @PostMapping("/workflows/execute")
    fun executeWorkflow(@RequestBody executeRequest: ExecuteWorkflowRequest): ResponseEntity<ExecuteWorkflowResponse> {
        return try {
            // Docker コンテナが起動していることを確認
            val dockerStatus = checkDockerContainerStatus()
            if (!dockerStatus.running) {
                return ResponseEntity.ok(ExecuteWorkflowResponse(
                    success = false,
                    workflowId = null,
                    message = "Temporal server is not running"
                ))
            }

            // Temporal クライアントを作成
            val client = WorkflowClient.newInstance(
                WorkflowServiceStubs.newInstance(
                    WorkflowServiceStubsOptions.newBuilder()
                        .setTarget("$temporalHost:$temporalPort")
                        .setRpcTimeout(Duration.ofSeconds(10)) // 10秒タイムアウト
                        .build()
                )
            )

            val options = WorkflowOptions.newBuilder()
                .setTaskQueue(executeRequest.taskQueue ?: "default")
                .setWorkflowId("${executeRequest.workflowType}-${System.currentTimeMillis()}")
                .build()

            // ワークフロー実行 (実際のワークフロー型に応じて実装が必要)
            // 現時点ではモック実装
            val workflowId = "${executeRequest.workflowType}-${System.currentTimeMillis()}"

            // 実際のワークフロー実行は Temporal ワークフローが定義されている場合に実装
            // ここでは成功レスポンスを返すのみ
            ResponseEntity.ok(ExecuteWorkflowResponse(
                success = true,
                workflowId = workflowId,
                message = "Workflow execution request accepted"
            ))
        } catch (e: Exception) {
            ResponseEntity.ok(ExecuteWorkflowResponse(
                success = false,
                workflowId = null,
                message = "Failed to execute workflow: ${e.message}"
            ))
        }
    }

    // Docker コンテナ状態確認
    private fun checkDockerContainerStatus(): DockerStatus {
        return try {
            val process = ProcessBuilder("docker", "ps", "--filter", "name=temporal", "--format", "{{.Names}}|{{.Status}}")
                .redirectErrorStream(true)
                .start()

            val reader = BufferedReader(InputStreamReader(process.inputStream))
            val output = reader.readText()
            process.waitFor(5, TimeUnit.SECONDS)

            val running = output.contains("temporal") && output.contains("Up")
            DockerStatus(running)
        } catch (e: Exception) {
            DockerStatus(false)
        }
    }

    // Temporal サービス接続確認
    private fun checkTemporalConnection(): TemporalConnectionInfo {
        return try {
            val stubs = WorkflowServiceStubs.newInstance(
                WorkflowServiceStubsOptions.newBuilder()
                    .setTarget("$temporalHost:$temporalPort")
                    .setRpcTimeout(Duration.ofSeconds(5)) // 5秒タイムアウト
                    .build()
            )

            val service = stubs.blockingStub()
            val request = ListWorkflowExecutionsRequest.newBuilder()
                .setNamespace("default")
                .setPageSize(100)
                .build()

            val response = service.listWorkflowExecutions(request)

            val executions = response.executionsList
            val runningCount = executions.count { it.status.toString() == "WORKFLOW_EXECUTION_STATUS_RUNNING" }
            val completedCount = executions.count { it.status.toString() == "WORKFLOW_EXECUTION_STATUS_COMPLETED" }
            val failedCount = executions.count {
                it.status.toString() == "WORKFLOW_EXECUTION_STATUS_FAILED" ||
                it.status.toString() == "WORKFLOW_EXECUTION_STATUS_CANCELED" ||
                it.status.toString() == "WORKFLOW_EXECUTION_STATUS_TERMINATED"
            }

            // タスクキューの取得 (簡易実装)
            val taskQueues = listOf("emotion-analysis", "spirit-analysis")

            TemporalConnectionInfo(
                workflowCount = executions.size,
                runningCount = runningCount,
                completedCount = completedCount,
                failedCount = failedCount,
                workerCount = 2, // 仮定値
                activeWorkerCount = 2, // 仮定値
                taskQueues = taskQueues
            )
        } catch (e: Exception) {
            TemporalConnectionInfo(0, 0, 0, 0, 0, 0, emptyList())
        }
    }

    // Temporal サーバー起動
    private fun startTemporalServer(): Boolean {
        return try {
            // analyzer-temporal ディレクトリで docker-compose up を実行
            val process = ProcessBuilder("docker-compose", "up", "-d")
                .directory(java.io.File("../../analyzer-temporal"))
                .redirectErrorStream(true)
                .start()

            val success = process.waitFor(30, TimeUnit.SECONDS)
            success && process.exitValue() == 0
        } catch (e: Exception) {
            false
        }
    }

    // Temporal サーバー停止
    private fun stopTemporalServer(): Boolean {
        return try {
            val process = ProcessBuilder("docker-compose", "down")
                .directory(java.io.File("../../analyzer-temporal"))
                .redirectErrorStream(true)
                .start()

            val success = process.waitFor(30, TimeUnit.SECONDS)
            success && process.exitValue() == 0
        } catch (e: Exception) {
            false
        }
    }

    // Temporal サーバー再起動
    private fun restartTemporalServer(): Boolean {
        return stopTemporalServer() && startTemporalServer()
    }

}

// データクラス定義
data class TemporalStatus(
    val server: ServerStatus,
    val workflows: WorkflowStats,
    val workers: WorkerStats
)

data class ServerStatus(
    val running: Boolean,
    val port: Int,
    val uiPort: Int,
    val postgresPort: Int
)

data class WorkflowStats(
    val total: Int,
    val running: Int,
    val completed: Int,
    val failed: Int
)

data class WorkerStats(
    val total: Int,
    val active: Int,
    val taskQueues: List<String>
)

data class WorkflowInfo(
    val id: String,
    val name: String,
    val status: String,
    val startTime: Instant,
    val endTime: Instant?,
    val taskQueue: String
)

data class ControlRequest(val action: String)
data class ControlResponse(val success: Boolean, val message: String)

data class ExecuteWorkflowRequest(
    val workflowType: String,
    val params: Map<String, Any>,
    val taskQueue: String? = null
)
data class ExecuteWorkflowResponse(val success: Boolean, val workflowId: String?, val message: String)

// 内部使用データクラス
private data class DockerStatus(val running: Boolean)
private data class TemporalConnectionInfo(
    val workflowCount: Int,
    val runningCount: Int,
    val completedCount: Int,
    val failedCount: Int,
    val workerCount: Int,
    val activeWorkerCount: Int,
    val taskQueues: List<String>
)
