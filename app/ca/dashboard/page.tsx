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

export default function CADashboard() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [firmName, setFirmName] = useState('')
  const [firmCode, setFirmCode] = useState('')
  const [firmId, setFirmId] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('clients')
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/ca/login'); return }

    const { data: firm } = await supabase
      .from('firms')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (firm) {
      setFirmName(firm.firm_name)
      setFirmCode(firm.firm_code)
      setFirmId(firm.id)

      const { data: clientList } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', firm.id)

      setClients(clientList || [])

      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('firm_id', firm.id)
        .eq('read', false)
        .order('created_at', { ascending: false })

      setNotifications(notifData || [])
    }
    setLoading(false)
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('firm_id', firmId)
      .eq('read', false)
    setNotifications([])
    setShowNotifications(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading dashboard…</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-medium text-gray-900">
          CA<span className="text-emerald-600">Flow</span>
          <span className="text-sm font-normal text-gray-500 ml-2">{firmName}</span>
        </h1>
        <div className="flex items-center gap-3">
          <div
            className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-emerald-100"
            onClick={() => {
              navigator.clipboard.writeText(firmCode)
              alert('Firm code copied!')
            }}>
            <span className="text-xs text-gray-500">Firm code: </span>
            <span className="text-sm font-medium text-emerald-600 tracking-wider">{firmCode}</span>
            <span className="text-xs text-gray-400 ml-2">📋</span>
          </div>

          {/* Notification bell */}
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
                    <button
                      onClick={markAllRead}
                      className="text-xs text-emerald-600 hover:underline">
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
                        <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                          📄
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(n.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short'
                            })} · {new Date(n.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit'
                            })}
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
              const res = await fetch('/api/cron', {
                headers: { 'Authorization': `Bearer caflow-cron-2026` }
              })
              const data = await res.json()
              alert(JSON.stringify(data.results, null, 2))
            }}
            className="text-sm text-amber-600 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-50">
            Send reminders
          </button>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total clients</p>
            <p className="text-2xl font-medium text-gray-900">{clients.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Active engagements</p>
            <p className="text-2xl font-medium text-emerald-600">
              {clients.filter(c => c.status === 'active').length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Firm code</p>
            <p className="text-2xl font-medium text-gray-900">{firmCode}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 border-b border-gray-200 pb-3">
          {['clients', 'documents', 'followups'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm capitalize
                ${activeTab === tab
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'}`}>
              {tab === 'followups' ? '🔔 Reminders' : tab}
            </button>
          ))}
        </div>

        {activeTab === 'clients' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-700">Client roster</h2>
              <button
                onClick={() => router.push('/ca/add-client')}
                className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700">
                + Add client
              </button>
            </div>

            {clients.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
                <p className="text-gray-400 text-sm mb-3">No clients yet</p>
                <button
                  onClick={() => router.push('/ca/add-client')}
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
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(client => (
                      <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{client.full_name}</p>
                          <p className="text-xs text-gray-500">{client.email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{client.engagement_type}</td>
                        <td className="px-4 py-3 text-gray-600">{client.phone}</td>
                        <td className="px-4 py-3">
                          <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full">
                            {client.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/ca/client/${client.id}`)}
                            className="text-xs text-emerald-600 hover:underline">
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">Document extraction view — coming soon</p>
          </div>
        )}

        {activeTab === 'followups' && (
          <FollowupHistory firmId={firmId} clients={clients} />
        )}
      </div>

      <ChatBot context="ca" contextData={JSON.stringify(clients)} />
    </main>
  )
}

function FollowupHistory({ firmId, clients }: { firmId: string, clients: Client[] }) {
  const [followups, setFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFollowups()
  }, [firmId, clients])

  async function loadFollowups() {
    if (!firmId || clients.length === 0) { setLoading(false); return }
    const clientIds = clients.map(c => c.id)

    const { data } = await supabase
      .from('followups')
      .select('*')
      .in('client_id', clientIds)
      .order('sent_at', { ascending: false })
      .limit(50)

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
      <p className="text-gray-400 text-xs mt-1">
        Click "Send reminders" or wait for the daily auto-reminder at 9 AM
      </p>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-gray-700">
          Reminder history
          <span className="ml-2 text-xs text-gray-400 font-normal">
            {followups.length} total sent
          </span>
        </h2>
      </div>
      {followups.map(fu => {
        const esc = getEscalationLabel(fu.escalation_step)
        const date = new Date(fu.sent_at)
        const dateStr = date.toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric'
        })
        const timeStr = date.toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit'
        })
        return (
          <div key={fu.id}
            className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">
                  {getClientName(fu.client_id)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${esc.color}`}>
                  {esc.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {fu.channel === 'whatsapp' ? '📱 WhatsApp' : '📧 Email'}
                </span>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {dateStr} · {timeStr}
              </span>
            </div>
            <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
              {fu.message}
            </p>
          </div>
        )
      })}
    </div>
  )
}