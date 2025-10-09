// src/test/kotlin/com/gftdcojp/spiritinphysics/PactProviderTest.kt
package com.gftdcojp.spiritinphysics

import au.com.dius.pact.provider.junit5.PactVerificationContext
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider
import au.com.dius.pact.provider.junitsupport.Provider
import au.com.dius.pact.provider.junitsupport.State
import au.com.dius.pact.provider.junitsupport.loader.PactBroker
import au.com.dius.pact.provider.junitsupport.loader.PactBrokerAuth
import au.com.dius.pact.provider.spring.junit5.PactVerificationSpringProvider
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.TestTemplate
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig

/**
 * Merkle DAG: pact_provider_test
 * Pact Provider テスト - Temporal API の契約テスト
 * Consumer (フロントエンド) との API 契約を検証
 */
@Provider("spirit-backend")
@PactBroker(
    host = "localhost",
    port = "9292",
    authentication = PactBrokerAuth(username = "admin", password = "password")
)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@SpringJUnitConfig
class PactProviderTest {

    @TestTemplate
    @ExtendWith(PactVerificationSpringProvider::class)
    fun pactVerificationTestTemplate(context: PactVerificationContext) {
        context.verifyInteraction()
    }

    @BeforeEach
    fun before(context: PactVerificationContext) {
        context.target = au.com.dius.pact.provider.junitsupport.Target(
            au.com.dius.pact.provider.junitsupport.HttpTarget("localhost", 8080)
        )
    }

    /**
     * Temporal サーバーが実行中の状態を設定
     */
    @State("temporal server is running")
    fun temporalServerRunning() {
        // Temporal サーバーが起動している状態を準備
        // 実際のテスト環境では Docker Compose で Temporal を起動
    }

    /**
     * Temporal サーバーが停止中の状態を設定
     */
    @State("temporal server is stopped")
    fun temporalServerStopped() {
        // Temporal サーバーが停止している状態を準備
    }

    /**
     * ワークフロー実行データが存在する状態を設定
     */
    @State("workflow executions exist")
    fun workflowExecutionsExist() {
        // テスト用のワークフロー実行データを準備
    }

    /**
     * ワークフロー実行データが存在しない状態を設定
     */
    @State("no workflow executions exist")
    fun noWorkflowExecutionsExist() {
        // ワークフロー実行データが存在しない状態を準備
    }
}
