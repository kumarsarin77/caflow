'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  full_name: string
  email: string
  phone: string
  pan: string
  engagement_type: string
  status: string
}

type Document = {
  id: string
  name: string
  due_date: string
  status: string
  file_url: string | null
  extracted_json: any
  flags: any
  followup_count: number
}

export default function ClientDetail() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadClient()
  }, [clientId])

  async function loadClient() {
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientData) setClient(clientData)

    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at')

    setDocuments(docs || [])
    setLoading(false)
  }

  async function markReceived(docId: string) {
    await supabase
      .from('documents')
      .update({ status: 'verified' })
      .eq('id', docId)
    loadClient()
  }

  async function markOverdue(docId: string) {
    await supabase
      .from('documents')
      .update({ status: 'overdue' })
      .eq('id', docId)
    loadClient()
  }

  async function generateFollowup() {
    if (!client) return
    setGenerating(true)
    setMessage('')

    const pending = documents.filter(d => d.status !== 'verified')
    if (pending.length === 0) {
      setMessage('All documents received! No follow-up needed.')
      setGenerating(false)
      return
    }

    const pendingList = pending.map(d => `• ${d.name}`).join('\n')
    const followupCount = Math.max(...documents.map(d => d.followup_count), 0)
    const tone = followupCount === 0
      ? 'polite and friendly'
      : followupCount === 1
      ? 'firm but professional'
      : 'urgent, mention filing deadline risk'

    const prompt = channel === 'whatsapp'
      ? `You are a CA firm assistant. Write a ${tone} WhatsApp message (reminder ${followupCount + 1}) to client "${client.full_name}" for their ${client.engagement_type} filing.\n\nPending documents:\n${pendingList}\n\nUnder 120 words. Address by first name. Sign off as "CA Team". No markdown or asterisks.`
      : `You are a CA firm assistant. Write a ${tone} email (reminder ${followupCount + 1}) to client "${client.full_name}" for their ${client.engagement_type} filing.\n\nPending documents:\n${pendingList}\n\nStart with SUBJECT: on first line, then email body. Under 150 words. Sign off as "CA Team". No markdown.`

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      console.log('Frontend received:', data)

      if (data.error) {
        setMessage('Error: ' + data.error)
      } else {
        setMessage(data.message)
      }

      await supabase
        .from('documents')
        .update({ followup_count: followupCount + 1 })
        .eq('client_id', clientId)
        .neq('status', 'verified')

      await supabase.from('followups').insert({
        client_id: clientId,
        channel,
        message: data.message,
        escalation_step: followupCount + 1
      })

    } catch (e: any) {
      setMessage('Could not generate message. Please try again.')
    }
    setGenerating(false)
  }

  function copyMessage() {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const received = documents.filter(d => d.status === 'verified').length
  const pending = documents.filter(d => d.status === 'pending').length
  const overdue = documents.filter(d => d.status === 'overdue').length

  if (loading) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading…</p>
    </main>
  )

  if (!client) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Client not found</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/ca/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <div>
            <h1 className="text-lg font-medium text-gray-900">{client.full_name}</h1>
            <p className="text-xs text-gray-500">
              {client.engagement_type} · {client.email} · {client.phone}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-medium text-gray-900">{documents.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Received</p>
            <p className="text-xl font-medium text-emerald-600">{received}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-xl font-medium text-amber-500">{pending}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Overdue</p>
            <p className="text-xl font-medium text-red-500">{overdue}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Document checklist</h2>
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0
                    ${doc.status === 'verified' ? 'bg-emerald-500' :
                      doc.status === 'overdue' ? 'bg-red-500' :
                      doc.status === 'uploaded' ? 'bg-blue-500' : 'bg-amber-400'}`} />
                  <div>
                    <p className="text-sm text-gray-800">{doc.name}</p>
                    <p className="text-xs text-gray-400">
                      Due: {doc.due_date} · Follow-ups: {doc.followup_count}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full
                    ${doc.status === 'verified' ? 'bg-emerald-50 text-emerald-700' :
                      doc.status === 'overdue' ? 'bg-red-50 text-red-700' :
                      doc.status === 'uploaded' ? 'bg-blue-50 text-blue-700' :
                      'bg-amber-50 text-amber-700'}`}>
                    {doc.status}
                  </span>
                  {doc.status !== 'verified' && (
                    <button
                      onClick={() => markReceived(doc.id)}
                      className="text-xs text-emerald-600 hover:underline">
                      ✓ Received
                    </button>
                  )}
                  {doc.status === 'pending' && (
                    <button
                      onClick={() => markOverdue(doc.id)}
                      className="text-xs text-red-500 hover:underline">
                      Overdue
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-700">
              AI follow-up draft
              <span className="ml-2 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                AI
              </span>
            </h2>
            <div className="flex gap-2">
              {(['whatsapp', 'email'] as const).map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`text-xs px-3 py-1.5 rounded-lg border capitalize
                    ${channel === ch
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-gray-200 text-gray-600 hover:border-emerald-400'}`}>
                  {ch === 'whatsapp' ? '📱 WhatsApp' : '📧 Email'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateFollowup}
            disabled={generating}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 mb-3">
            {generating ? 'Drafting message…' : '✨ Generate follow-up message'}
          </button>

          {message && (
            <div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap mb-3">
                {message}
              </div>
              <button
                onClick={copyMessage}
                className="w-full border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                {copied ? '✓ Copied!' : 'Copy message'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}