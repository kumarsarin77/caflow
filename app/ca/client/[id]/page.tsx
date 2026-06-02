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
  address: string
  gst_no: string
  employment_type: string
  employer_name: string
  annual_income: string
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
  const [activeTab, setActiveTab] = useState('checklist')

  useEffect(() => { loadClient() }, [clientId])

  async function loadClient() {
    const { data: clientData } = await supabase
      .from('clients').select('*').eq('id', clientId).single()
    if (clientData) setClient(clientData)

    const { data: docs } = await supabase
      .from('documents').select('*').eq('client_id', clientId).order('created_at')
    setDocuments(docs || [])
    setLoading(false)
  }

  async function markReceived(docId: string) {
    await supabase.from('documents').update({ status: 'verified' }).eq('id', docId)
    loadClient()
  }

  async function markOverdue(docId: string) {
    await supabase.from('documents').update({ status: 'overdue' }).eq('id', docId)
    loadClient()
  }

  async function generateFollowup() {
    if (!client) return
    setGenerating(true)
    setMessage('')

    const pendingDocs = documents.filter(d => d.status !== 'verified')
    if (pendingDocs.length === 0) {
      setMessage('All documents received! No follow-up needed.')
      setGenerating(false)
      return
    }

    const pendingList = pendingDocs.map(d => `• ${d.name}`).join('\n')
    const followupCount = Math.max(...documents.map(d => d.followup_count), 0)
    const tone = followupCount === 0 ? 'polite and friendly'
      : followupCount === 1 ? 'firm but professional'
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
      setMessage(data.error ? 'Error: ' + data.error : data.message)

      await supabase.from('documents')
        .update({ followup_count: followupCount + 1 })
        .eq('client_id', clientId).neq('status', 'verified')

      await supabase.from('followups').insert({
        client_id: clientId, channel,
        message: data.message, escalation_step: followupCount + 1
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
  const uploaded = documents.filter(d => d.status === 'uploaded').length
  const pending = documents.filter(d => d.status === 'pending').length
  const overdue = documents.filter(d => d.status === 'overdue').length

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #fef3c7 100%)' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-600 text-base font-medium">Loading client…</p>
      </div>
    </main>
  )

  if (!client) return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #fef3c7 100%)' }}>
      <p className="text-gray-500 text-base">Client not found</p>
    </main>
  )

  return (
    <main className="min-h-screen p-6"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #fef9c3 100%)' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/ca/dashboard')}
            className="bg-white/80 backdrop-blur-sm text-gray-600 px-4 py-2 rounded-xl hover:bg-white shadow-sm border border-white font-medium transition-all text-sm">
            ← Back
          </button>
          <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-sm border border-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
                {client.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{client.full_name}</h1>
                <p className="text-sm text-gray-500">
                  {client.engagement_type} · {client.email} · {client.phone}
                  {client.pan && ` · PAN: ${client.pan}`}
                </p>
              </div>
              <span className="ml-auto bg-emerald-100 text-emerald-700 text-sm px-3 py-1 rounded-full font-medium">
                {client.status}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl p-4 text-white shadow-lg text-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            <p className="text-3xl font-bold">{documents.length}</p>
            <p className="text-sm opacity-80 mt-1">Total docs</p>
          </div>
          <div className="rounded-2xl p-4 text-white shadow-lg text-center"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <p className="text-3xl font-bold">{received}</p>
            <p className="text-sm opacity-80 mt-1">Verified</p>
          </div>
          <div className="rounded-2xl p-4 text-white shadow-lg text-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <p className="text-3xl font-bold">{uploaded}</p>
            <p className="text-sm opacity-80 mt-1">Uploaded</p>
          </div>
          <div className="rounded-2xl p-4 text-white shadow-lg text-center"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <p className="text-3xl font-bold">{overdue}</p>
            <p className="text-sm opacity-80 mt-1">Overdue</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 shadow-sm w-fit">
          {['checklist', 'files', 'followup', 'profile'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all
                ${activeTab === tab
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/80'}`}>
              {tab === 'checklist' ? '📋 Checklist' :
               tab === 'files' ? '📁 Files' :
               tab === 'followup' ? '✨ AI follow-up' : '👤 Profile'}
            </button>
          ))}
        </div>

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white space-y-3">
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-500 text-base">No documents assigned yet</p>
              </div>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/80 hover:bg-white transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0
                        ${doc.status === 'verified' ? 'bg-emerald-500' :
                          doc.status === 'overdue' ? 'bg-red-500' :
                          doc.status === 'uploaded' ? 'bg-blue-500' : 'bg-amber-400'}`} />
                      <div>
                        <p className="text-base font-semibold text-gray-800">{doc.name}</p>
                        <p className="text-sm text-gray-400">Due: {doc.due_date} · Follow-ups: {doc.followup_count}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm px-3 py-1 rounded-full font-medium
                        ${doc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                          doc.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          doc.status === 'uploaded' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'}`}>
                        {doc.status}
                      </span>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline border border-blue-200 px-3 py-1 rounded-xl font-medium">
                          📄 View
                        </a>
                      )}
                      {doc.status === 'uploaded' && (
                        <button onClick={() => markReceived(doc.id)}
                          className="text-sm bg-emerald-500 text-white px-3 py-1 rounded-xl hover:bg-emerald-600 font-medium transition-all">
                          ✓ Verify
                        </button>
                      )}
                      {doc.status !== 'verified' && doc.status !== 'uploaded' && (
                        <button onClick={() => markReceived(doc.id)}
                          className="text-sm text-emerald-600 hover:underline font-medium">
                          ✓ Received
                        </button>
                      )}
                      {doc.status === 'pending' && (
                        <button onClick={() => markOverdue(doc.id)}
                          className="text-sm text-red-500 hover:underline font-medium">
                          Mark overdue
                        </button>
                      )}
                    </div>
                  </div>
                  {doc.extracted_json && (
                    <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-sm font-semibold text-emerald-700 mb-2">✨ AI extracted data</p>
                      {Object.entries(doc.extracted_json)
                        .filter(([k, v]) => v && k !== 'flags' && k !== 'document_type')
                        .map(([key, value]) => (
                          <div key={key} className="flex gap-2 text-sm">
                            <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="text-gray-800 font-semibold">{String(value)}</span>
                          </div>
                        ))}
                      {doc.flags && Array.isArray(doc.flags) && doc.flags.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-emerald-200">
                          {doc.flags.map((flag: string, i: number) => (
                            <p key={i} className="text-sm text-red-600 font-medium">⚠️ {flag}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* FILES TAB */}
        {activeTab === 'files' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white space-y-3">
            {documents.filter(d => d.file_url).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📁</p>
                <p className="text-gray-500 text-base">No files uploaded yet</p>
                <p className="text-gray-400 text-sm mt-1">Files will appear here once the client uploads them</p>
              </div>
            ) : (
              documents.filter(d => d.file_url).map(doc => (
                <div key={doc.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/80 hover:bg-white transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl shadow-sm">📄</div>
                    <div>
                      <p className="text-base font-semibold text-gray-800">{doc.name}</p>
                      <p className="text-sm text-gray-400">
                        {doc.status === 'verified' ? '✓ Verified by CA' : 'Uploaded by client — awaiting review'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium
                      ${doc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {doc.status}
                    </span>
                    <a href={doc.file_url!} target="_blank" rel="noopener noreferrer"
                      className="text-sm bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 font-medium shadow-md shadow-blue-200 transition-all">
                      View →
                    </a>
                    {doc.status === 'uploaded' && (
                      <button onClick={() => markReceived(doc.id)}
                        className="text-sm bg-emerald-500 text-white px-4 py-2 rounded-xl hover:bg-emerald-600 font-medium shadow-md shadow-emerald-200 transition-all">
                        ✓ Verify
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-700 font-medium">👁️ View only — client manages their own profile</p>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: 'Full name', value: client.full_name },
                { label: 'Phone', value: client.phone },
                { label: 'Email', value: client.email },
                { label: 'PAN', value: client.pan },
                { label: 'GST number', value: client.gst_no },
                { label: 'Employment type', value: client.employment_type },
                { label: 'Employer', value: client.employer_name },
                { label: 'Annual income', value: client.annual_income },
              ].map(field => (
                <div key={field.label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">{field.label}</p>
                  <p className="text-base font-semibold text-gray-800">{field.value || '—'}</p>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Address</p>
              <p className="text-base font-semibold text-gray-800">{client.address || '—'}</p>
            </div>
          </div>
        )}

        {/* AI FOLLOW-UP TAB */}
        {activeTab === 'followup' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-800">
                ✨ AI follow-up draft
                <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">AI powered</span>
              </h2>
              <div className="flex gap-2">
                {(['whatsapp', 'email'] as const).map(ch => (
                  <button key={ch} onClick={() => setChannel(ch)}
                    className={`text-sm px-4 py-2 rounded-xl font-medium transition-all
                      ${channel === ch
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                        : 'border border-gray-200 text-gray-600 hover:border-emerald-400 hover:bg-emerald-50'}`}>
                    {ch === 'whatsapp' ? '📱 WhatsApp' : '📧 Email'}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4 mb-5"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
              <p className="text-sm text-amber-800 font-medium">
                📋 {pending + overdue} document{pending + overdue !== 1 ? 's' : ''} pending ·
                Reminder tone escalates automatically with each follow-up
              </p>
            </div>
            <button onClick={generateFollowup} disabled={generating}
              className="w-full text-white py-3 rounded-xl text-base font-semibold mb-4 disabled:opacity-50 shadow-lg transition-all"
              style={{ background: generating ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)' }}>
              {generating ? '⏳ Drafting message…' : '✨ Generate follow-up message'}
            </button>
            {message && (
              <div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-base text-gray-700 whitespace-pre-wrap mb-4 leading-relaxed">
                  {message}
                </div>
                <button onClick={copyMessage}
                  className="w-full border-2 border-emerald-200 text-emerald-600 py-3 rounded-xl text-base font-semibold hover:bg-emerald-50 transition-all">
                  {copied ? '✓ Copied!' : '📋 Copy message'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}