'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  full_name: string
  email: string
  address: string
  gst_no: string
  engagement_type: string
}

type Firm = {
  id: string
  firm_name: string
  ca_name: string
  address: string
  city: string
  phone: string
  email: string
  gst_no: string
}

type Invoice = {
  id: string
  invoice_number: string
  client_id: string
  service_description: string
  amount: number
  gst_type: string
  gst_amount: number
  total_amount: number
  status: string
  due_date: string
  created_at: string
}

export default function InvoicesPage() {
  const router = useRouter()
  const [firm, setFirm] = useState<Firm | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '', service_description: '', amount: '',
    gst_type: 'intrastate', apply_gst: true, due_date: ''
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/ca/login'); return }

    const { data: firmData } = await supabase
      .from('firms').select('*').eq('user_id', user.id).single()
    if (!firmData) return

    setFirm({ ...firmData, email: user.email || '' })

    const { data: clientList } = await supabase
      .from('clients').select('*').eq('firm_id', firmData.id)
    setClients(clientList || [])

    const { data: invoiceList } = await supabase
      .from('invoices').select('*').eq('firm_id', firmData.id)
      .order('created_at', { ascending: false })
    setInvoices(invoiceList || [])

    setLoading(false)
  }

  function getAmount() { return parseFloat(form.amount) || 0 }
  function getCGST() { return (!form.apply_gst || form.gst_type !== 'intrastate') ? 0 : getAmount() * 0.09 }
  function getSGST() { return (!form.apply_gst || form.gst_type !== 'intrastate') ? 0 : getAmount() * 0.09 }
  function getIGST() { return (!form.apply_gst || form.gst_type !== 'interstate') ? 0 : getAmount() * 0.18 }
  function getGSTAmount() { return !form.apply_gst ? 0 : getAmount() * 0.18 }
  function getTotal() { return getAmount() + getGSTAmount() }

  function generateInvoiceNumber() {
    const now = new Date()
    const yr = now.getFullYear().toString().slice(2)
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    return `INV-${yr}${mo}-${Math.floor(100 + Math.random() * 900)}`
  }

  async function handleSave() {
    if (!firm || !form.client_id || !form.amount || !form.service_description) {
      alert('Please fill in all required fields'); return
    }
    setSaving(true)
    try {
      await supabase.from('invoices').insert({
        firm_id: firm.id, client_id: form.client_id,
        invoice_number: generateInvoiceNumber(),
        service_description: form.service_description,
        amount: getAmount(), gst_type: form.apply_gst ? form.gst_type : 'none',
        gst_amount: getGSTAmount(), total_amount: getTotal(),
        status: 'draft', due_date: form.due_date || null,
      })
      await loadData()
      setShowForm(false)
      setForm({ client_id: '', service_description: '', amount: '', gst_type: 'intrastate', apply_gst: true, due_date: '' })
    } catch (e: any) { alert('Error saving invoice: ' + e.message) }
    setSaving(false)
  }

  async function handleSend(invoice: Invoice) {
    const client = clients.find(c => c.id === invoice.client_id)
    if (!client) return
    try {
      await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice.id)
      await fetch('/api/send-invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice, client, firm })
      })
      await loadData()
      alert(`Invoice sent to ${client.full_name}!`)
    } catch (e: any) { alert('Error: ' + e.message) }
  }

  async function markPaid(invoiceId: string) {
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId)
    await loadData()
  }

  function getClientName(clientId: string) {
    return clients.find(c => c.id === clientId)?.full_name || 'Unknown'
  }

  const totalBilled = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0)
  const totalReceived = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0)

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #fef3c7 100%)' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-600 text-base font-medium">Loading invoices…</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #fef9c3 100%)' }}>

      {/* TOP BAR */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/50 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/ca/dashboard')}
            className="bg-white/80 text-gray-600 px-4 py-2 rounded-xl hover:bg-white shadow-sm border border-white font-medium text-sm transition-all">
            ← Dashboard
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              CA<span className="text-emerald-500">Flow</span>
              <span className="text-base font-normal text-gray-400 ml-2">· Invoices</span>
            </h1>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-200 font-semibold text-sm transition-all">
          + New invoice
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-6">

        {/* STAT CARDS */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl p-5 text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            <div className="text-3xl mb-2">🧾</div>
            <p className="text-indigo-100 text-sm mb-1">Total invoices</p>
            <p className="text-4xl font-bold">{invoices.length}</p>
          </div>
          <div className="rounded-2xl p-5 text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <div className="text-3xl mb-2">📤</div>
            <p className="text-blue-100 text-sm mb-1">Sent</p>
            <p className="text-4xl font-bold">{invoices.filter(i => i.status === 'sent').length}</p>
          </div>
          <div className="rounded-2xl p-5 text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="text-3xl mb-2">✅</div>
            <p className="text-emerald-100 text-sm mb-1">Paid</p>
            <p className="text-4xl font-bold">{invoices.filter(i => i.status === 'paid').length}</p>
          </div>
          <div className="rounded-2xl p-5 text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <div className="text-3xl mb-2">💰</div>
            <p className="text-violet-100 text-sm mb-1">Total billed</p>
            <p className="text-3xl font-bold">₹{totalBilled.toLocaleString('en-IN')}</p>
            <p className="text-violet-200 text-xs mt-1">₹{totalReceived.toLocaleString('en-IN')} received</p>
          </div>
        </div>

        {/* NEW INVOICE FORM */}
        {showForm && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg border border-white">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">New invoice</h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-2">Client *</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-emerald-500 bg-white"
                    value={form.client_id}
                    onChange={e => setForm({ ...form, client_id: e.target.value })}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-2">Due date</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-emerald-500"
                    value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Service description *</label>
                <textarea rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="e.g. ITR filing for AY 2025-26"
                  value={form.service_description}
                  onChange={e => setForm({ ...form, service_description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-2">Amount (₹) *</label>
                  <input type="number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 5000"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-2">GST</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setForm({ ...form, apply_gst: !form.apply_gst })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                        ${form.apply_gst ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200' : 'border-gray-300 text-gray-600'}`}>
                      {form.apply_gst ? 'GST applied ✓' : 'No GST'}
                    </button>
                    {form.apply_gst && (
                      <>
                        <button onClick={() => setForm({ ...form, gst_type: 'intrastate' })}
                          className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all
                            ${form.gst_type === 'intrastate' ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-200' : 'border-gray-300 text-gray-600'}`}>
                          Intra-state
                        </button>
                        <button onClick={() => setForm({ ...form, gst_type: 'interstate' })}
                          className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all
                            ${form.gst_type === 'interstate' ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-200' : 'border-gray-300 text-gray-600'}`}>
                          Inter-state
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Live calculation */}
              {form.amount && (
                <div className="rounded-2xl p-5 space-y-2"
                  style={{ background: 'linear-gradient(135deg, #f0fdf4, #d1fae5)' }}>
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600 font-medium">Base amount</span>
                    <span className="font-semibold">₹{getAmount().toLocaleString('en-IN')}</span>
                  </div>
                  {form.apply_gst && form.gst_type === 'intrastate' && (
                    <>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>CGST (9%)</span>
                        <span>₹{getCGST().toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>SGST (9%)</span>
                        <span>₹{getSGST().toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
                  {form.apply_gst && form.gst_type === 'interstate' && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>IGST (18%)</span>
                      <span>₹{getIGST().toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-emerald-200 pt-3 mt-1">
                    <span>Total</span>
                    <span className="text-emerald-600">₹{getTotal().toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 text-white py-3 rounded-xl text-base font-semibold disabled:opacity-50 shadow-md transition-all"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  {saving ? '⏳ Saving…' : '💾 Save invoice'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl text-base font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INVOICE LIST */}
        {invoices.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-16 text-center shadow-sm border border-white">
            <p className="text-5xl mb-4">🧾</p>
            <p className="text-gray-500 text-lg font-medium mb-2">No invoices yet</p>
            <p className="text-gray-400 text-sm mb-6">Create your first invoice to get started</p>
            <button onClick={() => setShowForm(true)}
              className="bg-emerald-500 text-white px-6 py-3 rounded-xl hover:bg-emerald-600 font-semibold shadow-md shadow-emerald-200 transition-all">
              + Create first invoice
            </button>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-white">
            <table className="w-full">
              <thead style={{ background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)' }}>
                <tr>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">Invoice</th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">Client</th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">Service</th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="border-t border-gray-100 hover:bg-emerald-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900 text-base">{invoice.invoice_number}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(invoice.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                          {getClientName(invoice.client_id).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-base font-semibold text-gray-800">{getClientName(invoice.client_id)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-sm max-w-xs truncate">{invoice.service_description}</td>
                    <td className="px-5 py-4">
                      <p className="text-base font-bold text-gray-900">₹{invoice.total_amount?.toLocaleString('en-IN')}</p>
                      <p className="text-sm text-gray-400">
                        {invoice.gst_type === 'none' ? 'No GST' :
                         invoice.gst_type === 'intrastate' ? 'CGST+SGST' : 'IGST'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-sm px-3 py-1.5 rounded-full font-semibold
                        ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'}`}>
                        {invoice.status === 'paid' ? '✓ Paid' :
                         invoice.status === 'sent' ? '📤 Sent' : '📝 Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {invoice.status === 'draft' && (
                          <button onClick={() => handleSend(invoice)}
                            className="text-sm bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 font-semibold shadow-md shadow-blue-200 transition-all">
                            Send →
                          </button>
                        )}
                        {invoice.status === 'sent' && (
                          <button onClick={() => markPaid(invoice.id)}
                            className="text-sm bg-emerald-500 text-white px-4 py-2 rounded-xl hover:bg-emerald-600 font-semibold shadow-md shadow-emerald-200 transition-all">
                            Mark paid ✓
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}