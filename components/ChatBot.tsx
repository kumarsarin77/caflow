'use client'
import { useState, useRef, useEffect } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  context: 'ca' | 'client'
  contextData?: string
}

export default function ChatBot({ context, contextData }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const greeting = context === 'ca'
    ? "Hi! I'm your CA assistant. Ask me anything about your clients, documents, or follow-ups."
    : "Hi! I'm here to help you with your document submission. Ask me anything!"

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: greeting }])
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context,
          contextData
        })
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || 'Sorry, I could not process that.'
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.'
      }])
    }
    setLoading(false)
  }

  const suggestions = context === 'ca'
    ? ['Which clients are overdue?', 'Draft a follow-up message', 'What is TDS?']
    : ['What documents do I need?', 'What is Form 16?', 'When is my deadline?']

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat window */}
      {open && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-80 mb-4 flex flex-col overflow-hidden"
          style={{ height: '420px' }}>

          {/* Header */}
          <div className={`px-4 py-3 flex items-center justify-between
            ${context === 'ca' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm">
                🤖
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  {context === 'ca' ? 'CA Assistant' : 'Document Helper'}
                </p>
                <p className="text-white text-opacity-80 text-xs">Powered by AI</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white text-opacity-80 hover:text-opacity-100 text-lg leading-none">
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? context === 'ca'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-3 py-2 rounded-xl">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-1 flex-wrap">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-emerald-400 hover:text-emerald-600">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500" />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50
                ${context === 'ca' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              →
            </button>
          </div>
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-110
          ${context === 'ca' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
        {open ? '×' : '🤖'}
      </button>
    </div>
  )
}