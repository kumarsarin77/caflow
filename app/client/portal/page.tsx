'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ChatBot from '@/components/ChatBot'

type Document = {
  id: string
  name: string
  due_date: string
  status: string
  file_url: string | null
  followup_count: number
  extracted_json: any
  flags: any
}

type ClientInfo = {
  id: string
  full_name: string
  engagement_type: string
  firm_id: string
}

type Invoice = {
  id: string
  invoice_number: string
  service_description: string
  amount: number
  gst_type: string
  gst_amount: number
  total_amount: number
  status: string
  due_date: string
  created_at: string
}

export default function ClientPortal() {
  const router = useRouter()
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('checklist')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => { loadPortal() }, [])

  async function loadPortal() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/client/login'); return }

    const { data: client } = await supabase
      .from('clients').select('*').eq('user_id', user.id).single()
    if (!client) { router.push('/client/login'); return }

    setClientInfo(client)

    const { data: docs } = await supabase
      .from('documents').select('*').eq('client_id', client.id).order('created_at')
    setDocuments(docs || [])

    const { data: invoiceList } = await supabase
      .from('invoices').select('*').eq('client_id', client.id)
      .order('created_at', { ascending: false })
    setInvoices(invoiceList || [])

    setLoading(false)
  }

  async function handleUpload(docId: string, file: File) {
    if (!clientInfo) return
    setUploading(docId)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${clientInfo.id}/${docId}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('documents').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
      await supabase.from('documents').update({
        status: 'uploaded', file_url: publicUrl, extraction_status: 'processing'
      }).eq('id', docId)

      await loadPortal()

      const docName = documents.find(d => d.id === docId)?.name || 'document'
      await supabase.from('notifications').insert({
        firm_id: clientInfo.firm_id, client_id: clientInfo.id,
        type: 'document_uploaded',
        message: `${clientInfo.full_name} uploaded "${docName}"`, read: false
      })

      const extractRes = await fetch('/api/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: publicUrl, documentName: docName })
      })
      const extractData = await extractRes.json()
      if (extractData.extracted) {
        await supabase.from('documents').update({
          extracted_json: extractData.extracted,
          extraction_status: 'done', flags: extractData.extracted.flags
        }).eq('id', docId)
      }
      await loadPortal()
    } catch (e: any) { alert('Upload failed: ' + e.message) }
    setUploading(null)
  }

  async function handleDelete(docId: string) {
    if (!clientInfo) return
    if (!window.confirm('Delete this uploaded file?')) return
    try {
      const doc = documents.find(d => d.id === docId)
      if (!doc?.file_url) return
      const urlParts = doc.file_url.split('/')
      const fileName = `${clientInfo.id}/${docId}.${urlParts[urlParts.length - 1].split('.').pop()}`
      await supabase.storage.from('documents').remove([fileName])
      await supabase.from('documents').update({
        status: 'pending', file_url: null,
        extracted_json: null, extraction_status: 'pending', flags: null
      }).eq('id', docId)
      await loadPortal()
    } catch (e: any) { alert('Delete failed: ' + e.message) }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const received = documents.filter(d => d.status === 'uploaded' || d.status === 'verified').length
  const pending = documents.filter(d => d.status === 'pending').length
  const overdue = documents.filter(d => d.status === 'overdue').length
  const pct = documents.length > 0 ? Math.round(received / documents.length * 100) : 0

  const navItems = [
    { key: 'checklist', icon: '📋', label: 'Checklist' },
    { key: 'uploaded', icon: '📁', label: 'Uploaded files' },
    { key: 'invoices', icon: '🧾', label: 'Invoices' },
  ]

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 50%, #fef3c7 100%)' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-600 text-base font-medium">Loading your portal...</p>
      </div>
    </main>
  )

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 50%, #fef9c3 100%)' }}>

      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-56' : 'w-16'} flex-shrink-0 flex flex-col transition-all duration-300`}
        style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #1e40af 50%, #1d4ed8 100%)' }}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-blue-700">
          {sidebarOpen && (
            <span className="text-white font-bold text-xl">CA<span className="text-blue-300">Flow</span></span>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-blue-300 hover:text-white p-1 rounded-lg hover:bg-blue-700 transition-colors ml-auto">
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Client name */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-blue-700">
            <p className="text-blue-300 text-xs">Client</p>
            <p className="text-white text-sm font-semibold truncate">{clientInfo?.full_name}</p>
            <p className="text-blue-200 text-xs truncate mt-0.5">{clientInfo?.engagement_type}</p>
          </div>
        )}

        {/* Progress */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-blue-700">
            <div className="flex justify-between mb-1">
              <p className="text-blue-300 text-xs">Filing progress</p>
              <p className="text-white text-xs font-bold">{pct}%</p>
            </div>
            <div className="h-2 bg-blue-900 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-300 to-emerald-400 rounded-full transition-all"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left
                ${activeTab === item.key
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
          <div className="pt-2 border-t border-blue-700 mt-2">
            <button onClick={() => router.push('/client/profile')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-200 hover:bg-white/10 hover:text-white transition-all text-left">
              <span className="text-lg flex-shrink-0">⚙️</span>
              {sidebarOpen && <span className="text-sm font-medium">Profile</span>}
            </button>
          </div>
        </nav>

        <div className="px-2 py-4 border-t border-blue-700">
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-300 hover:bg-white/10 hover:text-white transition-all text-left">
            <span className="text-lg flex-shrink-0">🚪</span>
            {sidebarOpen && <span className="text-sm font-medium">Sign out</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR */}
        <div className="bg-white/70 backdrop-blur-md border-b border-white/50 px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {navItems.find(n => n.key === activeTab)?.label || 'Portal'}
            </h1>
            <p className="text-xs text-gray-400">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl px-4 py-2 text-center text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <p className="text-lg font-bold">{received}</p>
                <p className="text-xs opacity-80">Uploaded</p>
              </div>
              <div className="rounded-xl px-4 py-2 text-center text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <p className="text-lg font-bold">{pending}</p>
                <p className="text-xs opacity-80">Pending</p>
              </div>
              <div className="rounded-xl px-4 py-2 text-center text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                <p className="text-lg font-bold">{overdue}</p>
                <p className="text-xs opacity-80">Overdue</p>
              </div>
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* CHECKLIST TAB */}
          {activeTab === 'checklist' && (
            <div className="space-y-3 max-w-3xl">
              <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-200 rounded-2xl p-4">
                <p className="text-sm text-blue-700 font-medium">
                  📎 Accepted: PDF, JPG, PNG · For Word files please save as PDF first
                </p>
              </div>
              {documents.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center shadow-sm">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-500 text-base">No documents assigned yet</p>
                  <p className="text-gray-400 text-sm mt-1">Your CA will add documents to your checklist</p>
                </div>
              ) : (
                documents.map(doc => (
                  <div key={doc.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0
                          ${doc.status === 'verified' ? 'bg-emerald-500' :
                            doc.status === 'uploaded' ? 'bg-blue-500' :
                            doc.status === 'overdue' ? 'bg-red-500' : 'bg-amber-400'}`} />
                        <div>
                          <p className="text-base font-semibold text-gray-800">{doc.name}</p>
                          <p className="text-sm text-gray-400 mt-0.5">Due: {doc.due_date}</p>
                          {doc.followup_count > 0 && (
                            <p className="text-sm text-amber-600 mt-0.5 font-medium">
                              {doc.followup_count} reminder{doc.followup_count > 1 ? 's' : ''} sent by CA
                            </p>
                          )}
                          {doc.extracted_json && (
                            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                              <p className="text-sm font-semibold text-emerald-700 mb-1">✨ AI extracted data</p>
                              {Object.entries(doc.extracted_json)
                                .filter(([k, v]) => v && k !== 'flags' && k !== 'document_type')
                                .slice(0, 5)
                                .map(([key, value]) => (
                                  <div key={key} className="flex gap-2 text-sm">
                                    <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                                    <span className="text-gray-800 font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              {doc.flags && Array.isArray(doc.flags) && doc.flags.length > 0 && (
                                <div className="mt-1 pt-1 border-t border-emerald-200">
                                  {doc.flags.map((flag: string, i: number) => (
                                    <p key={i} className="text-sm text-red-600">⚠️ {flag}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-sm px-3 py-1 rounded-full font-medium
                          ${doc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                            doc.status === 'uploaded' ? 'bg-blue-100 text-blue-700' :
                            doc.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'}`}>
                          {doc.status === 'verified' ? '✓ Verified' :
                           doc.status === 'uploaded' ? '✓ Uploaded' :
                           doc.status === 'overdue' ? 'Overdue' : 'Pending'}
                        </span>
                        {doc.status !== 'verified' && (
                          <div className="flex items-center gap-2">
                            <label className={`text-sm px-4 py-2 rounded-xl font-medium cursor-pointer transition-all
                              ${uploading === doc.id
                                ? 'bg-gray-100 text-gray-400'
                                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-200'}`}>
                              {uploading === doc.id ? 'Uploading...' :
                               doc.status === 'uploaded' ? '🔄 Re-upload' : '↑ Upload'}
                              <input type="file" className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                disabled={uploading === doc.id}
                                onChange={e => {
                                  const file = e.target.files?.[0]
                                  if (file) handleUpload(doc.id, file)
                                }} />
                            </label>
                            {doc.status === 'uploaded' && (
                              <button onClick={() => handleDelete(doc.id)}
                                className="text-sm px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-all">
                                🗑️
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* UPLOADED FILES TAB */}
          {activeTab === 'uploaded' && (
            <div className="space-y-3 max-w-3xl">
              <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-200 rounded-2xl p-4">
                <p className="text-sm text-blue-700 font-medium">
                  📎 Accepted formats: PDF, JPG, PNG · For Word documents please save as PDF first
                </p>
              </div>
              {documents.filter(d => d.file_url).length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center shadow-sm">
                  <p className="text-4xl mb-3">📁</p>
                  <p className="text-gray-500 text-base">No files uploaded yet</p>
                </div>
              ) : (
                documents.filter(d => d.file_url).map(doc => (
                  <div key={doc.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white flex items-center justify-between hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl shadow-sm">📄</div>
                      <div>
                        <p className="text-base font-semibold text-gray-800">{doc.name}</p>
                        <p className="text-sm text-gray-400">
                          {doc.status === 'verified' ? '✓ Verified by CA' : 'Uploaded — awaiting CA review'}
                        </p>
                      </div>
                    </div>
                    <a href={doc.file_url!} target="_blank" rel="noopener noreferrer"
                      className="text-sm bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 font-medium shadow-md shadow-blue-200 transition-all">
                      View →
                    </a>
                  </div>
                ))
              )}
            </div>
          )}

          {/* INVOICES TAB */}
          {activeTab === 'invoices' && (
            <div className="space-y-4 max-w-3xl">
              {invoices.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center shadow-sm">
                  <p className="text-4xl mb-3">🧾</p>
                  <p className="text-gray-500 text-base">No invoices yet</p>
                  <p className="text-gray-400 text-sm mt-1">Invoices from your CA will appear here</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    <div className="rounded-2xl p-4 text-white text-center shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                      <p className="text-3xl font-bold">{invoices.length}</p>
                      <p className="text-sm opacity-80 mt-1">Total</p>
                    </div>
                    <div className="rounded-2xl p-4 text-white text-center shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                      <p className="text-3xl font-bold">{invoices.filter(i => i.status === 'sent').length}</p>
                      <p className="text-sm opacity-80 mt-1">Pending payment</p>
                    </div>
                    <div className="rounded-2xl p-4 text-white text-center shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                      <p className="text-3xl font-bold">{invoices.filter(i => i.status === 'paid').length}</p>
                      <p className="text-sm opacity-80 mt-1">Paid</p>
                    </div>
                  </div>
                  {invoices.map(invoice => (
                    <div key={invoice.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-base font-bold text-gray-900">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-400">
                            {new Date(invoice.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                            {invoice.due_date && ` · Due: ${new Date(invoice.due_date).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short'
                            })}`}
                          </p>
                        </div>
                        <span className={`text-sm px-3 py-1 rounded-full font-medium
                          ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            invoice.status === 'sent' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'}`}>
                          {invoice.status === 'paid' ? '✓ Paid' :
                           invoice.status === 'sent' ? 'Payment due' : invoice.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">{invoice.service_description}</p>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Base amount</span>
                          <span className="font-medium">₹{invoice.amount?.toLocaleString('en-IN')}</span>
                        </div>
                        {invoice.gst_type === 'intrastate' && (
                          <>
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>CGST (9%)</span>
                              <span>₹{(invoice.amount * 0.09).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>SGST (9%)</span>
                              <span>₹{(invoice.amount * 0.09).toLocaleString('en-IN')}</span>
                            </div>
                          </>
                        )}
                        {invoice.gst_type === 'interstate' && (
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>IGST (18%)</span>
                            <span>₹{(invoice.amount * 0.18).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-1">
                          <span>Total</span>
                          <span className="text-emerald-600">₹{invoice.total_amount?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {overdue > 0 && (
            <div className="mt-4 max-w-3xl rounded-2xl p-4 shadow-sm border border-red-200"
              style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>
              <p className="text-base text-red-700 font-bold">
                ⚠️ You have {overdue} overdue document{overdue > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-600 mt-1">
                Please upload them immediately to avoid filing delays.
              </p>
            </div>
          )}
        </div>
      </div>

      <ChatBot context="client" contextData={JSON.stringify({
        name: clientInfo?.full_name,
        engagement: clientInfo?.engagement_type,
        documents: documents.map(d => ({ name: d.name, status: d.status, due_date: d.due_date }))
      })} />
    </div>
  )
}