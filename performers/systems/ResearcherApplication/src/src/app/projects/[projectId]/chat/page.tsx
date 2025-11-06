// Merkle DAG: project_chat_page -> ai_agent_chat_workbench
// AI Agent chat workbench ページ

'use client'

import { useState } from 'react'

export default function ProjectChatPage({
  params,
}: {
  params: { projectId: string }
}) {
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = { role: 'user' as const, content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // TODO: AI Agent API呼び出しを実装
    setTimeout(() => {
      const assistantMessage = {
        role: 'assistant' as const,
        content: 'AI Agentチャット機能は今後実装予定です。',
      }
      setMessages((prev) => [...prev, assistantMessage])
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">AI Agent チャット</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* チャット履歴 */}
        <div className="h-96 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p>AI Agentとのチャットを開始しましょう</p>
              <p className="text-sm mt-2">
                研究の進捗状況、分析結果の解釈、実験設定の推奨などについて質問できます
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                入力中...
              </div>
            </div>
          )}
        </div>

        {/* 入力フィールド */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="質問を入力..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  )
}

