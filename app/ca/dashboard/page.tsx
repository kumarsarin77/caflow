'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('clients')

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

      const { data: clientList } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', firm.id)

      setClients(clientList || [])
    }
    setLoading(false)
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
      {/* Navbar */}
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
<button
  onClick={async () => {
    const res = await fetch('/api/cron', {
      headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` }
    })
    const data = await res.json()
    alert(`Reminders sent: ${data.results?.length || 0} clients processed`)
  }}
  className="text-sm text-amber-600 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-50">
  🔔 Send reminders
</button>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Stats */}
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

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200 pb-3">
          {['clients', 'documents', 'followups'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm capitalize
                ${activeTab === tab
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Clients tab */}
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
            <p className="text-gray-400 text-sm">Document extraction view — coming in next phase</p>
          </div>
        )}

        {activeTab === 'followups' && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">Follow-up queue — coming in next phase</p>
          </div>
        )}
      </div>
    </main>
  )
}