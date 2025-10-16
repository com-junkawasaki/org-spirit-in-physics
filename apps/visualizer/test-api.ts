#!/usr/bin/env npx tsx

// Merkle DAG: api_test -> neo4j_client_validation
// API エンドポイントの動作検証スクリプト

import { createNeo4jClient } from './src/lib/neo4j'

async function testNeo4jClient() {
  console.log('🔍 Neo4jClient の動作検証を開始...')
  
  try {
    const client = createNeo4jClient()
    console.log('✅ Neo4jClient インスタンス作成成功')
    
    // メソッドの存在確認
    const methods = [
      'getSessionsByParticipantId',
      'getEmotionDataByParticipantId',
      'createParticipant',
      'createSessionEvents',
      'createWordResponses',
      'createEmotionEntries',
      'createPhysiologicalData'
    ]
    
    console.log('\n📋 メソッド存在確認:')
    for (const method of methods) {
      const exists = typeof (client as any)[method] === 'function'
      console.log(`  ${exists ? '✅' : '❌'} ${method}: ${exists ? '存在' : '不存在'}`)
    }
    
    // 実際のメソッド呼び出しテスト
    console.log('\n🧪 メソッド呼び出しテスト:')
    
    try {
      const sessions = await client.getSessionsByParticipantId('test-id')
      console.log('✅ getSessionsByParticipantId: 呼び出し成功')
    } catch (error: any) {
      console.log(`❌ getSessionsByParticipantId: ${error.message}`)
    }
    
    try {
      const emotions = await client.getEmotionDataByParticipantId('test-id')
      console.log('✅ getEmotionDataByParticipantId: 呼び出し成功')
    } catch (error: any) {
      console.log(`❌ getEmotionDataByParticipantId: ${error.message}`)
    }
    
    console.log('\n🎯 テスト完了')
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message)
    console.error('スタック:', error.stack)
  }
}

// 実行
testNeo4jClient().catch(console.error)
