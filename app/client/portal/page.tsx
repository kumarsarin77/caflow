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

      const { data: { publicUrl } } = supabase.storage
        .from('documents').getPublicUrl(fileName)

      await supabase.from('documents').update({
        status: 'uploaded',
        file_url: publicUrl,
        extraction_status: 'processing'
      }).eq('id', docId)

      await loadPortal()

      const docName = documents.find(d => d.id === docId)?.name || 'document'
      await supabase.from('notifications').insert({
        firm_id: clientInfo.firm_id,
        client_id: clientInfo.id,
        type: 'document_uploaded',
        message: `${clientInfo.full_name} uploaded "${docName}"`,
        read: false
      })

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: publicUrl, documentName: docName })
      })
      const extractData = await extractRes.json()

      if (extractData.extracted) {
        await supabase.from('documents').update({
          extracted_json: extractData.extracted,
          extraction_status: 'done',
          flags: extractData.extracted.flags
        }).eq('id', docId)
      }

      await loadPortal()
    } catch (e: any) {
      alert('Upload failed: ' + e.message)
    }
    setUploading(null)
  }

  async function handleDelete(docId: string) {
    if (!clientInfo) return
    const confirmed = window.confirm('Delete this uploaded file?')
    if (!confirmed) return
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
    } catch (e: any) {
      alert('Delete failed: ' + e.message)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const received = documents.filter(d => d.status === 'uploaded' || d.status === 'verified').length
  const pending = documents.filter(d => d.status === 'pending').length
  const overdue = documents.filter(d => d.status === 'overdue').length
  const pct = documents.length > 0 ? Math.round(received / documents.length * 100) : 0

  function getInvoiceStatusStyle(status: string) {
    if (status === 'paid') return 'bg-emerald-50 text-emerald-700'
    if (status === 'sent') return 'bg-blue-50 text-blue-700'
    return 'bg-gray-100 text-gray-600'
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading your portal...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-medium text-gray-900">
          CA<span className="text-emerald-600">Flow</span>
          <span className="text-sm font-normal text-gray-500 ml-2">{clientInfo?.full_name}</span>
        </h1>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/client/profile')}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
            ⚙️ Profile
          </button>
          <button onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-700">{clientInfo?.engagement_type}</h2>
            <span className="text-sm font-medium text-emerald-600">{pct}% complete</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-medium text-emerald-600">{received}</p>
              <p className="text-xs text-gray-500">Uploaded</p>
            </div>
            <div>
              <p className="text-xl font-medium text-amber-500">{pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div>
              <p className="text-xl font-medium text-red-500">{overdue}</p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200 pb-3">
          {['checklist', 'uploaded', 'invoices'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm
                ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab === 'checklist' ? '📋 Checklist' :
               tab === 'uploaded' ? '📁 Uploaded files' : '🧾 Invoices'}
            </button>
          ))}
        </div>

        {/* Checklist tab */}
        {activeTab === 'checklist' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700">
                📎 Accepted: PDF, JPG, PNG · For Word files please save as PDF first
              </p>
            </div>
            {documents.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
                <p className="text-gray-400 text-sm">No documents assigned yet</p>
                <p className="text-gray-400 text-xs mt-1">Your CA will add documents to your checklist</p>
              </div>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                        ${doc.status === 'verified' ? 'bg-emerald-500' :
                          doc.status === 'uploaded' ? 'bg-blue-500' :
                          doc.status === 'overdue' ? 'bg-red-500' : 'bg-amber-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Due: {doc.due_date}</p>
                        {doc.followup_count > 0 && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            {doc.followup_count} reminder{doc.followup_count > 1 ? 's' : ''} sent by CA
                          </p>
                        )}
                        {doc.extracted_json && (
                          <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                            <p className="text-xs font-medium text-emerald-700 mb-1">✨ AI extracted data</p>
                            {Object.entries(doc.extracted_json)
                              .filter(([k, v]) => v && k !== 'flags' && k !== 'document_type')
                              .slice(0, 5)
                              .map(([key, value]) => (
                                <div key={key} className="flex gap-2 text-xs">
                                  <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                                  <span className="text-gray-800 font-medium">{String(value)}</span>
                                </div>
                              ))}
                            {doc.flags && Array.isArray(doc.flags) && doc.flags.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-emerald-200">
                                {doc.flags.map((flag: string, i: number) => (
                                  <p key={i} className="text-xs text-red-600">⚠️ {flag}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full
                        ${doc.status === 'verified' ? 'bg-emerald-50 text-emerald-700' :
                          doc.status === 'uploaded' ? 'bg-blue-50 text-blue-700' :
                          doc.status === 'overdue' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'}`}>
                        {doc.status === 'verified' ? '✓ Verified' :
                         doc.status === 'uploaded' ? '✓ Uploaded' :
                         doc.status === 'overdue' ? 'Overdue' : 'Pending'}
                      </span>
                      {doc.status !== 'verified' && (
                        <div className="flex items-center gap-2">
                          <label className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer
                            ${uploading === doc.id
                              ? 'bg-gray-100 text-gray-400 border-gray-200'
                              : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'}`}>
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
                              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
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

        {/* Uploaded files tab */}
        {activeTab === 'uploaded' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700">
                📎 Accepted formats: PDF, JPG, PNG · For Word documents please save as PDF first
              </p>
            </div>
            {documents.filter(d => d.file_url).length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
                <p className="text-gray-400 text-sm">No files uploaded yet</p>
              </div>
            ) : (
              documents.filter(d => d.file_url).map(doc => (
                <div key={doc.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-sm">📄</div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                      <p className="text-xs text-gray-400">
                        {doc.status === 'verified' ? '✓ Verified by CA' : 'Uploaded — awaiting CA review'}
                      </p>
                    </div>
                  </div>
                  <a href={doc.file_url!} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline">View</a>
                </div>
              ))
            )}
          </div>
        )}

        {/* Invoices tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
                <p className="text-3xl mb-3">🧾</p>
                <p className="text-gray-400 text-sm">No invoices yet</p>
                <p className="text-gray-400 text-xs mt-1">Invoices from your CA will appear here</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-gray-900">{invoices.length}</p>
                    <p className="text-xs text-gray-400 mt-1">Total</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-amber-500">
                      {invoices.filter(i => i.status === 'sent').length}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Pending payment</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-emerald-600">
                      {invoices.filter(i => i.status === 'paid').length}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Paid</p>
                  </div>
                </div>
                {invoices.map(invoice => (
                  <div key={invoice.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(invoice.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                          {invoice.due_date && ` · Due: ${new Date(invoice.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short'
                          })}`}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getInvoiceStatusStyle(invoice.status)}`}>
                        {invoice.status === 'paid' ? '✓ Paid' :
                         invoice.status === 'sent' ? 'Payment due' : invoice.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{invoice.service_description}</p>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Base amount</span>
                        <span>₹{invoice.amount?.toLocaleString('en-IN')}</span>
                      </div>
                      {invoice.gst_type === 'intrastate' && (
                        <>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>CGST (9%)</span>
                            <span>₹{(invoice.amount * 0.09).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>SGST (9%)</span>
                            <span>₹{(invoice.amount * 0.09).toLocaleString('en-IN')}</span>
                          </div>
                        </>
                      )}
                      {invoice.gst_type === 'interstate' && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>IGST (18%)</span>
                          <span>₹{(invoice.amount * 0.18).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2 mt-1">
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
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-medium">
              ⚠️ You have {overdue} overdue document{overdue > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-600 mt-1">
              Please upload them immediately to avoid filing delays.
            </p>
          </div>
        )}
      </div>

      <ChatBot context="client" contextData={JSON.stringify({
        name: clientInfo?.full_name,
        engagement: clientInfo?.engagement_type,
        documents: documents.map(d => ({ name: d.name, status: d.status, due_date: d.due_date }))
      })} />
    </main>
  )
}