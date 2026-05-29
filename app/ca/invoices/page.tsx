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
    client_id: '',
    service_description: '',
    amount: '',
    gst_type: 'intrastate',
    apply_gst: true,
    due_date: ''
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

  function getAmount() {
    return parseFloat(form.amount) || 0
  }

  function getGSTRate() {
    if (!form.apply_gst) return 0
    return form.gst_type === 'intrastate' ? 0.18 : 0.18
  }

  function getCGST() {
    if (!form.apply_gst || form.gst_type !== 'intrastate') return 0
    return getAmount() * 0.09
  }

  function getSGST() {
    if (!form.apply_gst || form.gst_type !== 'intrastate') return 0
    return getAmount() * 0.09
  }

  function getIGST() {
    if (!form.apply_gst || form.gst_type !== 'interstate') return 0
    return getAmount() * 0.18
  }

  function getGSTAmount() {
    return getAmount() * getGSTRate()
  }

  function getTotal() {
    return getAmount() + getGSTAmount()
  }

  function generateInvoiceNumber() {
    const now = new Date()
    const yr = now.getFullYear().toString().slice(2)
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    const rand = Math.floor(100 + Math.random() * 900)
    return `INV-${yr}${mo}-${rand}`
  }

  async function handleSave() {
    if (!firm || !form.client_id || !form.amount || !form.service_description) {
      alert('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      const invoiceNumber = generateInvoiceNumber()
      const gstType = form.apply_gst ? form.gst_type : 'none'
      const gstAmount = getGSTAmount()
      const totalAmount = getTotal()

      const { data: newInvoice } = await supabase.from('invoices').insert({
        firm_id: firm.id,
        client_id: form.client_id,
        invoice_number: invoiceNumber,
        service_description: form.service_description,
        amount: getAmount(),
        gst_type: gstType,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        status: 'draft',
        due_date: form.due_date || null,
      }).select().single()

      await loadData()
      setShowForm(false)
      setForm({
        client_id: '',
        service_description: '',
        amount: '',
        gst_type: 'intrastate',
        apply_gst: true,
        due_date: ''
      })
    } catch (e: any) {
      alert('Error saving invoice: ' + e.message)
    }
    setSaving(false)
  }

  async function handleSend(invoice: Invoice) {
    const client = clients.find(c => c.id === invoice.client_id)
    if (!client) return

    try {
      await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice.id)

      await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice, client, firm })
      })

      await loadData()
      alert(`Invoice sent to ${client.full_name}!`)
    } catch (e: any) {
      alert('Error sending invoice: ' + e.message)
    }
  }

  async function markPaid(invoiceId: string) {
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId)
    await loadData()
  }

  function getClientName(clientId: string) {
    return clients.find(c => c.id === clientId)?.full_name || 'Unknown'
  }

  function getStatusStyle(status: string) {
    if (status === 'paid') return 'bg-emerald-50 text-emerald-700'
    if (status === 'sent') return 'bg-blue-50 text-blue-700'
    if (status === 'draft') return 'bg-gray-100 text-gray-600'
    return 'bg-amber-50 text-amber-700'
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading invoices…</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/ca/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</button>
          <h1 className="text-lg font-medium text-gray-900">
            CA<span className="text-emerald-600">Flow</span>
            <span className="text-sm font-normal text-gray-500 ml-2">Invoices</span>
          </h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700">
          + New invoice
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total invoices</p>
            <p className="text-2xl font-semibold text-gray-900">{invoices.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Sent</p>
            <p className="text-2xl font-semibold text-blue-500">
              {invoices.filter(i => i.status === 'sent').length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Paid</p>
            <p className="text-2xl font-semibold text-emerald-600">
              {invoices.filter(i => i.status === 'paid').length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total billed</p>
            <p className="text-2xl font-semibold text-violet-500">
              ₹{invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* New Invoice Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-medium text-gray-900">New invoice</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Client *</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    value={form.client_id}
                    onChange={e => setForm({ ...form, client_id: e.target.value })}>
                    <option value="">Select client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Due date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Service description *</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="e.g. ITR filing for AY 2025-26"
                  value={form.service_description}
                  onChange={e => setForm({ ...form, service_description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 5000"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">GST</label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => setForm({ ...form, apply_gst: !form.apply_gst })}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all
                        ${form.apply_gst ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-300 text-gray-600'}`}>
                      {form.apply_gst ? 'GST applied' : 'No GST'}
                    </button>
                    {form.apply_gst && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setForm({ ...form, gst_type: 'intrastate' })}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all
                            ${form.gst_type === 'intrastate' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}>
                          Intra-state (CGST+SGST)
                        </button>
                        <button
                          onClick={() => setForm({ ...form, gst_type: 'interstate' })}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all
                            ${form.gst_type === 'interstate' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}>
                          Inter-state (IGST)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live calculation */}
              {form.amount && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base amount</span>
                    <span className="font-medium">₹{getAmount().toLocaleString('en-IN')}</span>
                  </div>
                  {form.apply_gst && form.gst_type === 'intrastate' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">CGST (9%)</span>
                        <span>₹{getCGST().toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">SGST (9%)</span>
                        <span>₹{getSGST().toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
                  {form.apply_gst && form.gst_type === 'interstate' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">IGST (18%)</span>
                      <span>₹{getIGST().toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span className="text-emerald-600 text-base">₹{getTotal().toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save invoice'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice list */}
        {invoices.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-3xl mb-3">🧾</p>
            <p className="text-gray-400 text-sm mb-3">No invoices yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700">
              Create your first invoice
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(invoice.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{getClientName(invoice.client_id)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{invoice.service_description}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">₹{invoice.total_amount?.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400">
                        {invoice.gst_type === 'none' ? 'No GST' :
                         invoice.gst_type === 'intrastate' ? 'CGST+SGST' : 'IGST'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleSend(invoice)}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                            Send
                          </button>
                        )}
                        {invoice.status === 'sent' && (
                          <button
                            onClick={() => markPaid(invoice.id)}
                            className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">
                            Mark paid
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