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

  function getFilingScore(clientId: string) {
    const clientDocs = documents.filter(d => d.client_id === clientId)
    if (clientDocs.length === 0) return 0
    const total = clientDocs.length
    const uploaded = clientDocs.filter(d => d.status === 'uploaded' || d.status === 'verified').length
    const overdue = clientDocs.filter(d => d.status === 'overdue').length
    const totalFollowups = clientDocs.reduce((sum, d) => sum + (d.followup_count || 0), 0)
    const docScore = (uploaded / total) * 60
    const overdueScore = overdue === 0 ? 20 : Math.max(0, 20 - (overdue * 5))
    const reminderScore = totalFollowups === 0 ? 10 : Math.max(0, 10 - (totalFollowups * 2))
    const dueDates = clientDocs.filter(d => d.due_date).map(d => new Date(d.due_date).getTime())
    let deadlineScore = 10
    if (dueDates.length > 0) {
      const daysLeft = Math.ceil((Math.min(...dueDates) - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) deadlineScore = 0
      else if (daysLeft < 3) deadlineScore = 2
      else if (daysLeft < 7) deadlineScore = 5
    }
    return Math.round(docScore + overdueScore + reminderScore + deadlineScore)
  }

  function getScoreBadge(score: number) {
    if (score >= 80) return { label: 'Ready to file', color: 'bg-emerald-100 text-emerald-700' }
    if (score >= 50) return { label: 'In progress', color: 'bg-amber-100 text-amber-700' }
    return { label: 'Action needed', color: 'bg-red-100 text-red-700' }
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
    <main className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #fef3c7 100%)' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm font-medium">Loading dashboard…</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #fef9c3 100%)' }}>

      {/* NAV */}
      <div className="bg-white/80 backdrop-blur-md border-b border-white/50 px-6 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">
          CA<span className="text-emerald-500">Flow</span>
          <span className="text-sm font-normal text-gray-400 ml-2">{firmName}</span>
        </h1>
        <div className="flex items-center gap-3">
          <div
            className="bg-emerald-500 text-white rounded-xl px-3 py-1.5 cursor-pointer hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all"
            onClick={() => { navigator.clipboard.writeText(firmCode); alert('Firm code copied!') }}>
            <span className="text-xs opacity-80">Code: </span>
            <span className="text-sm font-bold tracking-wider">{firmCode}</span>
            <span className="text-xs opacity-70 ml-1">📋</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 hover:shadow-md transition-all">
              🔔
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl z-50 border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">
                    Notifications
                    {notifications.length > 0 && (
                      <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                        {notifications.length}
                      </span>
                    )}
                  </span>
                  {notifications.length > 0 && (
                    <button onClick={markAllRead} className="text-xs text-emerald-600 hover:underline font-medium">
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
                        className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-emerald-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/ca/client/${n.client_id}`)}>
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">📄</div>
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
            className="bg-amber-400 text-white text-sm px-4 py-2 rounded-xl hover:bg-amber-500 shadow-md shadow-amber-200 font-medium transition-all">
            📨 Send reminders
          </button>
          <button onClick={() => router.push('/ca/profile')}
            className="bg-white text-gray-600 text-sm px-3 py-2 rounded-xl hover:bg-gray-50 shadow-sm border border-gray-100 transition-all">
            ⚙️
          </button>
          <button onClick={handleSignOut}
            className="bg-white text-gray-600 text-sm px-3 py-2 rounded-xl hover:bg-gray-50 shadow-sm border border-gray-100 transition-all">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">

        {/* TABS */}
        <div className="flex gap-2 mb-6 bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 shadow-sm w-fit">
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'clients', label: '👥 Clients' },
            { key: 'documents', label: '📋 Documents' },
            { key: 'followups', label: '🔔 Reminders' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all
                ${activeTab === tab.key
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/80'}`}>
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => router.push('/ca/invoices')}
            className="px-5 py-2 rounded-xl text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all ml-1">
            🧾 Invoices
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-5">

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-2xl p-5 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                <div className="text-3xl mb-1">👥</div>
                <p className="text-blue-100 text-xs mb-1">Total clients</p>
                <p className="text-4xl font-bold">{clients.length}</p>
                <p className="text-blue-200 text-xs mt-2">{clients.filter(c => c.status === 'active').length} active</p>
              </div>

              <div className="rounded-2xl p-5 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <div className="text-3xl mb-1">📋</div>
                <p className="text-emerald-100 text-xs mb-1">Docs received</p>
                <p className="text-4xl font-bold">{uploadedDocs}</p>
                <p className="text-emerald-200 text-xs mt-2">of {totalDocs} total</p>
              </div>

              <div className="rounded-2xl p-5 text-white shadow-lg shadow-orange-200 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                onClick={() => router.push('/ca/invoices')}>
                <div className="text-3xl mb-1">🧾</div>
                <p className="text-orange-100 text-xs mb-1">Invoices</p>
                <p className="text-4xl font-bold">{totalInvoices}</p>
                <p className="text-orange-200 text-xs mt-2">{paidInvoices} paid · {sentInvoices} sent</p>
              </div>

              <div className="rounded-2xl p-5 text-white shadow-lg shadow-violet-200 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                <div className="text-3xl mb-1">💰</div>
                <p className="text-violet-100 text-xs mb-1">Payments received</p>
                <p className="text-3xl font-bold">₹{totalReceived.toLocaleString('en-IN')}</p>
                <p className="text-violet-200 text-xs mt-2">₹{totalPending.toLocaleString('en-IN')} pending</p>
              </div>
            </div>

            {/* DOCUMENTS SECTION */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-white">
              <button
                onClick={() => setDocsExpanded(!docsExpanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/90 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">📋</div>
                  <span className="text-sm font-semibold text-gray-800">Document status & filing readiness</span>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{uploadedDocs} uploaded</span>
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{pendingDocs} pending</span>
                    {overdueDocs > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{overdueDocs} overdue</span>}
                  </div>
                </div>
                <span className="text-gray-400 text-xs">{docsExpanded ? '▲' : '▼'}</span>
              </button>
              {docsExpanded && (
                <div className="border-t border-gray-100 px-5 py-3">
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
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-white">
              <button
                onClick={() => setInvoicesExpanded(!invoicesExpanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/90 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">🧾</div>
                  <span className="text-sm font-semibold text-gray-800">Invoices</span>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{totalInvoices} total</span>
                    <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">{sentInvoices} sent</span>
                    <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">{paidInvoices} paid</span>
                  </div>
                </div>
                <span className="text-gray-400 text-xs">{invoicesExpanded ? '▲' : '▼'}</span>
              </button>
              {invoicesExpanded && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)' }}>
                      <p className="text-2xl font-bold text-gray-800">{totalInvoices}</p>
                      <p className="text-xs text-gray-500 mt-1">Generated</p>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>
                      <p className="text-2xl font-bold text-blue-600">{sentInvoices}</p>
                      <p className="text-xs text-gray-500 mt-1">Sent to clients</p>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
                      <p className="text-2xl font-bold text-emerald-600">₹{totalReceived.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-500 mt-1">Received</p>
                    </div>
                  </div>
                  <button onClick={() => router.push('/ca/invoices')}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm py-2.5 rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium shadow-md shadow-blue-200 transition-all">
                    Manage invoices →
                  </button>
                </div>
              )}
            </div>

            {/* PAYMENTS SECTION */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-white">
              <button
                onClick={() => setPaymentsExpanded(!paymentsExpanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/90 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">💰</div>
                  <span className="text-sm font-semibold text-gray-800">Payments</span>
                  <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">Coming soon</span>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">₹{totalReceived.toLocaleString('en-IN')} received</span>
                    <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">₹{totalPending.toLocaleString('en-IN')} pending</span>
                  </div>
                </div>
                <span className="text-gray-400 text-xs">{paymentsExpanded ? '▲' : '▼'}</span>
              </button>
              {paymentsExpanded && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
                      <p className="text-2xl font-bold text-emerald-600">₹{totalReceived.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-500 mt-1">Received</p>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                      <p className="text-2xl font-bold text-amber-600">₹{totalPending.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-500 mt-1">Pending</p>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>
                      <p className="text-2xl font-bold text-red-500">₹0</p>
                      <p className="text-xs text-gray-500 mt-1">Overdue</p>
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
              <h2 className="text-base font-semibold text-gray-800">Client roster</h2>
              <button onClick={() => router.push('/ca/add-client')}
                className="bg-emerald-500 text-white text-sm px-4 py-2 rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-200 font-medium transition-all">
                + Add client
              </button>
            </div>
            {clients.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-gray-400 text-sm mb-3">No clients yet</p>
                <button onClick={() => router.push('/ca/add-client')}
                  className="bg-emerald-500 text-white text-sm px-4 py-2 rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-200">
                  Add your first client
                </button>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-white">
                <table className="w-full text-sm">
                  <thead style={{ background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)' }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Engagement</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Phone</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Filing readiness</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(client => {
                      const score = getFilingScore(client.id)
                      const badge = getScoreBadge(score)
                      return (
                        <tr key={client.id} className="border-t border-gray-100 hover:bg-emerald-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                {client.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{client.full_name}</p>
                                <p className="text-xs text-gray-400">{client.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{client.engagement_type}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{client.phone}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${score}%` }} />
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                                {score}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">
                              {client.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => router.push(`/ca/client/${client.id}`)}
                              className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600 font-medium transition-all">
                              View →
                            </button>
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
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total', value: totalDocs, gradient: 'from-gray-400 to-gray-600' },
                { label: 'Uploaded', value: uploadedDocs, gradient: 'from-emerald-400 to-emerald-600' },
                { label: 'Pending', value: pendingDocs, gradient: 'from-amber-400 to-amber-600' },
                { label: 'Overdue', value: overdueDocs, gradient: 'from-red-400 to-red-600' },
              ].map(s => (
                <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-5 text-white shadow-lg`}>
                  <p className="text-3xl font-bold">{s.value}</p>
                  <p className="text-sm opacity-80 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-white">
              <table className="w-full text-sm">
                <thead style={{ background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Uploaded</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Pending</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Progress</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {clientDocStats.map(client => {
                    const pct = client.totalDocs > 0 ? Math.round(client.uploaded / client.totalDocs * 100) : 0
                    return (
                      <tr key={client.id} className="border-t border-gray-100 hover:bg-emerald-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">{client.full_name}</td>
                        <td className="px-4 py-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-medium">{client.uploaded}</span></td>
                        <td className="px-4 py-3"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">{client.pending}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-medium text-gray-600">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => router.push(`/ca/client/${client.id}`)}
                            className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600 font-medium transition-all">
                            View →
                          </button>
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
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white/60 hover:bg-white/90 transition-all">
      <div className="flex items-center gap-4 p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {client.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-800">{client.full_name}</p>
            <span className="text-xs text-gray-400">{pct}% docs</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex gap-2 text-xs flex-shrink-0 items-center">
          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{verified} ✓</span>
          {pending > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{pending} pending</span>}
          {overdue > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{overdue} overdue</span>}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
            {score}% · {badge.label}
          </span>
        </div>
        <span className="text-xs text-gray-400 w-4">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-3 space-y-2">
          {clientDocs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0
                  ${doc.status === 'verified' ? 'bg-emerald-500' :
                    doc.status === 'uploaded' ? 'bg-blue-500' :
                    doc.status === 'overdue' ? 'bg-red-500' : 'bg-amber-400'}`} />
                <span className="text-xs text-gray-700">{doc.name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${doc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                  doc.status === 'uploaded' ? 'bg-blue-100 text-blue-700' :
                  doc.status === 'overdue' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'}`}>
                {doc.status}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-200">
            <button onClick={onView}
              className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600 font-medium transition-all">
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
    if (step === 1) return { label: 'Reminder 1', color: 'bg-blue-100 text-blue-700' }
    if (step === 2) return { label: 'Reminder 2', color: 'bg-amber-100 text-amber-700' }
    if (step === 3) return { label: 'Reminder 3', color: 'bg-orange-100 text-orange-700' }
    return { label: 'Escalated', color: 'bg-red-100 text-red-700' }
  }

  if (loading) return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center shadow-sm">
      <p className="text-gray-400 text-sm">Loading reminder history…</p>
    </div>
  )

  if (followups.length === 0) return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center shadow-sm">
      <p className="text-4xl mb-3">🔔</p>
      <p className="text-gray-500 text-sm font-medium">No reminders sent yet</p>
      <p className="text-gray-400 text-xs mt-1">Click "Send reminders" or wait for the daily auto-reminder at 9 AM</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-800">
        Reminder history
        <span className="ml-2 text-xs text-gray-400 font-normal">{followups.length} total sent</span>
      </h2>
      {followups.map(fu => {
        const esc = getEscalationLabel(fu.escalation_step)
        const date = new Date(fu.sent_at)
        return (
          <div key={fu.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{getClientName(fu.client_id)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${esc.color}`}>{esc.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {fu.channel === 'whatsapp' ? '📱 WhatsApp' : fu.channel === 'whatsapp+email' ? '📱+📧 Both' : '📧 Email'}
                </span>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                · {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">{fu.message}</p>
          </div>
        )
      })}
    </div>
  )
}