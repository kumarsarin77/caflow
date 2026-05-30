'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ChatBot from '@/components/ChatBot'

type Client = {
  id: string
  full_name: string
  email: string
  phone: string
  engagement_type: string
  status: string
}

type Document = {
  id: string
  client_id: string
  name: string
  status: string
  due_date: string
  followup_count: number
}

type Invoice = {
  id: string
  client_id: string
  invoice_number: string
  total_amount: number
  status: string
}

export default function CADashboard() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [firmName, setFirmName] = useState('')
  const [firmCode, setFirmCode] = useState('')
  const [firmId, setFirmId] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [docsExpanded, setDocsExpanded] = useState(true)
  const [invoicesExpanded, setInvoicesExpanded] = useState(true)
  const [paymentsExpanded, setPaymentsExpanded] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/ca/login'); return }

    const { data: firm } = await supabase
      .from('firms').select('*').eq('user_id', user.id).single()

    if (firm) {
      setFirmName(firm.firm_name)
      setFirmCode(firm.firm_code)
      setFirmId(firm.id)

      const { data: clientList } = await supabase
        .from('clients').select('*').eq('firm_id', firm.id)
      setClients(clientList || [])

      if (clientList && clientList.length > 0) {
        const clientIds = clientList.map((c: Client) => c.id)
        const { data: docList } = await supabase
          .from('documents').select('*').in('client_id', clientIds)
        setDocuments(docList || [])
      }

      const { data: invoiceList } = await supabase
        .from('invoices').select('*').eq('firm_id', firm.id)
      setInvoices(invoiceList || [])

      const { data: notifData } = await supabase
        .from('notifications').select('*')
        .eq('firm_id', firm.id).eq('read', false)
        .order('created_at', { ascending: false })
      setNotifications(notifData || [])
    }
    setLoading(false)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true })
      .eq('firm_id', firmId).eq('read', false)
    setNotifications([])
    setShowNotifications(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Filing readiness score calculation
  function getFilingScore(clientId: string) {
    const clientDocs = documents.filter(d => d.client_id === clientId)
    if (clientDocs.length === 0) return 0

    const total = clientDocs.length
    const uploaded = clientDocs.filter(d => d.status === 'uploaded' || d.status === 'verified').length
    const overdue = clientDocs.filter(d => d.status === 'overdue').length
    const totalFollowups = clientDocs.reduce((sum, d) => sum + (d.followup_count || 0), 0)

    // 60% — documents uploaded
    const docScore = (uploaded / total) * 60

    // 20% — no overdue docs
    const overdueScore = overdue === 0 ? 20 : Math.max(0, 20 - (overdue * 5))

    // 10% — no pending reminders (fewer followups = better)
    const reminderScore = totalFollowups === 0 ? 10 : Math.max(0, 10 - (totalFollowups * 2))

    // 10% — days to deadline (use earliest due date)
    const dueDates = clientDocs
      .filter(d => d.due_date)
      .map(d => new Date(d.due_date).getTime())
    let deadlineScore = 10
    if (dueDates.length > 0) {
      const earliest = Math.min(...dueDates)
      const daysLeft = Math.ceil((earliest - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) deadlineScore = 0
      else if (daysLeft < 3) deadlineScore = 2
      else if (daysLeft < 7) deadlineScore = 5
      else deadlineScore = 10
    }

    return Math.round(docScore + overdueScore + reminderScore + deadlineScore)
  }

  function getScoreBadge(score: number) {
    if (score >= 80) return { label: 'Ready to file', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
    if (score >= 50) return { label: 'In progress', color: 'bg-amber-50 text-amber-700 border border-amber-200' }
    return { label: 'Action needed', color: 'bg-red-50 text-red-700 border border-red-200' }
  }

  const totalDocs = documents.length
  const uploadedDocs = documents.filter(d => d.status === 'uploaded' || d.status === 'verified').length
  const pendingDocs = documents.filter(d => d.status === 'pending').length
  const overdueDocs = documents.filter(d => d.status === 'overdue').length

  const totalInvoices = invoices.length
  const sentInvoices = invoices.filter(i => i.status === 'sent').length
  const paidInvoices = invoices.filter(i => i.status === 'paid').length
  const totalReceived = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0)
  const totalPending = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0)

  const clientDocStats = clients.map(client => {
    const clientDocs = documents.filter(d => d.client_id === client.id)
    const uploaded = clientDocs.filter(d => d.status === 'uploaded' || d.status === 'verified').length
    const pending = clientDocs.filter(d => d.status === 'pending' || d.status === 'overdue').length
    return { ...client, totalDocs: clientDocs.length, uploaded, pending }
  })

  if (loading) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading dashboard…</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      {/* NAV */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-medium text-gray-900">
          CA<span className="text-emerald-600">Flow</span>
          <span className="text-sm font-normal text-gray-500 ml-2">{firmName}</span>
        </h1>
        <div className="flex items-center gap-3">
          <div
            className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-emerald-100"
            onClick={() => { navigator.clipboard.writeText(firmCode); alert('Firm code copied!') }}>
            <span className="text-xs text-gray-500">Firm code: </span>
            <span className="text-sm font-medium text-emerald-600 tracking-wider">{firmCode}</span>
            <span className="text-xs text-gray-400 ml-2">📋</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
              🔔
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-900">
                    Notifications
                    {notifications.length > 0 && (
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                        {notifications.length} new
                      </span>
                    )}
                  </span>
                  {notifications.length > 0 && (
                    <button onClick={markAllRead} className="text-xs text-emerald-600 hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-400 text-sm">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id}
                        className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/ca/client/${n.client_id}`)}>
                        <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center text-sm flex-shrink-0">📄</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            · {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={async () => {
              const res = await fetch('/api/cron', { headers: { 'Authorization': `Bearer caflow-cron-2026` } })
              const data = await res.json()
              alert(`Reminders sent: ${data.results?.length || 0} clients processed`)
            }}
            className="text-sm text-amber-600 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-50">
            Send reminders
          </button>
          <button onClick={() => router.push('/ca/profile')}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
            ⚙️ Profile
          </button>
          <button onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* TABS */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'clients', label: '👥 Clients' },
            { key: 'documents', label: '📋 Documents' },
            { key: 'followups', label: '🔔 Reminders' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm
                ${activeTab === tab.key ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => router.push('/ca/invoices')}
            className="px-4 py-1.5 rounded-lg text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 ml-auto">
            🧾 Invoices
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Total clients</p>
                <p className="text-3xl font-semibold text-gray-900">{clients.length}</p>
                <p className="text-xs text-emerald-600 mt-1">{clients.filter(c => c.status === 'active').length} active</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Documents received</p>
                <p className="text-3xl font-semibold text-emerald-600">{uploadedDocs}</p>
                <p className="text-xs text-gray-400 mt-1">of {totalDocs} total</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-blue-50"
                onClick={() => router.push('/ca/invoices')}>
                <p className="text-xs text-gray-500 mb-1">Invoices generated</p>
                <p className="text-3xl font-semibold text-blue-500">{totalInvoices}</p>
                <p className="text-xs text-gray-400 mt-1">{paidInvoices} paid · {sentInvoices} sent</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Payments received</p>
                <p className="text-3xl font-semibold text-violet-500">₹{totalReceived.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400 mt-1">₹{totalPending.toLocaleString('en-IN')} pending</p>
              </div>
            </div>

            {/* DOCUMENTS SECTION */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setDocsExpanded(!docsExpanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">📋 Document status & filing readiness</span>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{uploadedDocs} uploaded</span>
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{pendingDocs} pending</span>
                    {overdueDocs > 0 && <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{overdueDocs} overdue</span>}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{docsExpanded ? '▲' : '▼'}</span>
              </button>
              {docsExpanded && (
                <div className="border-t border-gray-100 px-5 py-3">
                  <div className="flex gap-4 text-xs text-gray-500 mb-3 flex-wrap">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Uploaded</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Pending</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> Overdue</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block"></span> Ready to file</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block"></span> In progress</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block"></span> Action needed</span>
                  </div>
                  {clients.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">No clients yet</p>
                  ) : (
                    <div className="space-y-2">
                      {clients.map(client => {
                        const clientDocs = documents.filter(d => d.client_id === client.id)
                        const verified = clientDocs.filter(d => d.status === 'verified' || d.status === 'uploaded').length
                        const pending = clientDocs.filter(d => d.status === 'pending').length
                        const overdue = clientDocs.filter(d => d.status === 'overdue').length
                        const pct = clientDocs.length > 0 ? Math.round(verified / clientDocs.length * 100) : 0
                        const score = getFilingScore(client.id)
                        const badge = getScoreBadge(score)
                        return (
                          <ClientDocRow
                            key={client.id}
                            client={client}
                            clientDocs={clientDocs}
                            verified={verified}
                            pending={pending}
                            overdue={overdue}
                            pct={pct}
                            score={score}
                            badge={badge}
                            onView={() => router.push(`/ca/client/${client.id}`)}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* INVOICES SECTION */}
            <div className="bg-white border border-blue-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setInvoicesExpanded(!invoicesExpanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">🧾 Invoices</span>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">{totalInvoices} total</span>
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{sentInvoices} sent</span>
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">{paidInvoices} paid</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{invoicesExpanded ? '▲' : '▼'}</span>
              </button>
              {invoicesExpanded && (
                <div className="border-t border-blue-100 px-5 py-4">
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-2xl font-semibold text-gray-900">{totalInvoices}</p>
                      <p className="text-xs text-gray-400 mt-1">Generated</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-2xl font-semibold text-blue-500">{sentInvoices}</p>
                      <p className="text-xs text-gray-400 mt-1">Sent to clients</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <p className="text-2xl font-semibold text-emerald-600">₹{totalReceived.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400 mt-1">Received</p>
                    </div>
                  </div>
                  <button onClick={() => router.push('/ca/invoices')}
                    className="w-full border border-blue-200 text-blue-600 text-sm py-2 rounded-lg hover:bg-blue-50">
                    Manage invoices →
                  </button>
                </div>
              )}
            </div>

            {/* PAYMENTS SECTION */}
            <div className="bg-white border border-dashed border-violet-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setPaymentsExpanded(!paymentsExpanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-violet-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">💰 Payments</span>
                  <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">Coming soon</span>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">₹{totalReceived.toLocaleString('en-IN')} received</span>
                    <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">₹{totalPending.toLocaleString('en-IN')} pending</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{paymentsExpanded ? '▲' : '▼'}</span>
              </button>
              {paymentsExpanded && (
                <div className="border-t border-violet-100 px-5 py-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <p className="text-2xl font-semibold text-emerald-600">₹{totalReceived.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400 mt-1">Received</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4">
                      <p className="text-2xl font-semibold text-amber-500">₹{totalPending.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400 mt-1">Pending</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="text-2xl font-semibold text-red-400">₹0</p>
                      <p className="text-xs text-gray-400 mt-1">Overdue</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-4">Razorpay payment integration coming soon</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CLIENTS TAB */}
        {activeTab === 'clients' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-700">Client roster</h2>
              <button onClick={() => router.push('/ca/add-client')}
                className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700">
                + Add client
              </button>
            </div>
            {clients.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
                <p className="text-gray-400 text-sm mb-3">No clients yet</p>
                <button onClick={() => router.push('/ca/add-client')}
                  className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700">
                  Add your first client
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Engagement</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Phone</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Filing readiness</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(client => {
                      const score = getFilingScore(client.id)
                      const badge = getScoreBadge(score)
                      return (
                        <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{client.full_name}</p>
                            <p className="text-xs text-gray-500">{client.email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{client.engagement_type}</td>
                          <td className="px-4 py-3 text-gray-600">{client.phone}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${score}%` }} />
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                                {score}% · {badge.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full">
                              {client.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => router.push(`/ca/client/${client.id}`)}
                              className="text-xs text-emerald-600 hover:underline">View →</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 mb-2">
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-gray-900">{totalDocs}</p>
                <p className="text-xs text-gray-500 mt-1">Total</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-emerald-600">{uploadedDocs}</p>
                <p className="text-xs text-gray-500 mt-1">Uploaded</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-amber-500">{pendingDocs}</p>
                <p className="text-xs text-gray-500 mt-1">Pending</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-red-500">{overdueDocs}</p>
                <p className="text-xs text-gray-500 mt-1">Overdue</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Uploaded</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Pending</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Progress</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {clientDocStats.map(client => {
                    const pct = client.totalDocs > 0 ? Math.round(client.uploaded / client.totalDocs * 100) : 0
                    return (
                      <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{client.full_name}</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">{client.uploaded}</td>
                        <td className="px-4 py-3 text-amber-500 font-medium">{client.pending}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => router.push(`/ca/client/${client.id}`)}
                            className="text-xs text-emerald-600 hover:underline">View →</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REMINDERS TAB */}
        {activeTab === 'followups' && (
          <FollowupHistory firmId={firmId} clients={clients} />
        )}
      </div>

      <ChatBot context="ca" contextData={JSON.stringify(clients)} />
    </main>
  )
}

function ClientDocRow({ client, clientDocs, verified, pending, overdue, pct, score, badge, onView }: {
  client: any
  clientDocs: any[]
  verified: number
  pending: number
  overdue: number
  pct: number
  score: number
  badge: { label: string, color: string }
  onView: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}>
        <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center text-xs font-medium text-emerald-700 flex-shrink-0">
          {client.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-800">{client.full_name}</p>
            <span className="text-xs text-gray-500">{pct}% docs complete</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex gap-2 text-xs flex-shrink-0 items-center">
          <span className="text-emerald-600 font-medium">{verified} ✓</span>
          <span className="text-amber-500">{pending} pending</span>
          {overdue > 0 && <span className="text-red-500">{overdue} overdue</span>}
          <span className={`px-2 py-0.5 rounded-full text-xs ${badge.color}`}>
            {score}% · {badge.label}
          </span>
        </div>
        <span className="text-xs text-gray-400 w-4">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
          {clientDocs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0
                  ${doc.status === 'verified' ? 'bg-emerald-500' :
                    doc.status === 'uploaded' ? 'bg-blue-500' :
                    doc.status === 'overdue' ? 'bg-red-500' : 'bg-amber-400'}`} />
                <span className="text-xs text-gray-700">{doc.name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full
                ${doc.status === 'verified' ? 'bg-emerald-50 text-emerald-700' :
                  doc.status === 'uploaded' ? 'bg-blue-50 text-blue-700' :
                  doc.status === 'overdue' ? 'bg-red-50 text-red-700' :
                  'bg-amber-50 text-amber-700'}`}>
                {doc.status}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-200">
            <button onClick={onView} className="text-xs text-emerald-600 hover:underline">
              Open client page →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FollowupHistory({ firmId, clients }: { firmId: string, clients: Client[] }) {
  const [followups, setFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadFollowups() }, [firmId, clients])

  async function loadFollowups() {
    if (!firmId || clients.length === 0) { setLoading(false); return }
    const clientIds = clients.map(c => c.id)
    const { data } = await supabase
      .from('followups').select('*').in('client_id', clientIds)
      .order('sent_at', { ascending: false }).limit(50)
    setFollowups(data || [])
    setLoading(false)
  }

  function getClientName(clientId: string) {
    return clients.find(c => c.id === clientId)?.full_name || 'Unknown client'
  }

  function getEscalationLabel(step: number) {
    if (step === 1) return { label: 'Reminder 1', color: 'bg-blue-50 text-blue-700' }
    if (step === 2) return { label: 'Reminder 2', color: 'bg-amber-50 text-amber-700' }
    if (step === 3) return { label: 'Reminder 3', color: 'bg-orange-50 text-orange-700' }
    return { label: 'Escalated', color: 'bg-red-50 text-red-700' }
  }

  if (loading) return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
      <p className="text-gray-400 text-sm">Loading reminder history…</p>
    </div>
  )

  if (followups.length === 0) return (
    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
      <p className="text-2xl mb-3">🔔</p>
      <p className="text-gray-400 text-sm">No reminders sent yet</p>
      <p className="text-gray-400 text-xs mt-1">Click "Send reminders" or wait for the daily auto-reminder at 9 AM</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-gray-700">
        Reminder history
        <span className="ml-2 text-xs text-gray-400 font-normal">{followups.length} total sent</span>
      </h2>
      {followups.map(fu => {
        const esc = getEscalationLabel(fu.escalation_step)
        const date = new Date(fu.sent_at)
        return (
          <div key={fu.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">{getClientName(fu.client_id)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${esc.color}`}>{esc.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {fu.channel === 'whatsapp' ? '📱 WhatsApp' : fu.channel === 'whatsapp+email' ? '📱+📧 Both' : '📧 Email'}
                </span>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                · {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">{fu.message}</p>
          </div>
        )
      })}
    </div>
  )
}