'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CAProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    firm_name: '',
    ca_name: '',
    icai_no: '',
    city: '',
    phone: '',
    address: '',
    gst_no: '',
  })

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/ca/login'); return }

    const { data: firm } = await supabase
      .from('firms').select('*').eq('user_id', user.id).single()

    if (firm) {
      setForm({
        firm_name: firm.firm_name || '',
        ca_name: firm.ca_name || '',
        icai_no: firm.icai_no || '',
        city: firm.city || '',
        phone: firm.phone || '',
        address: firm.address || '',
        gst_no: firm.gst_no || '',
      })
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('firms').update({
        firm_name: form.firm_name,
        ca_name: form.ca_name,
        icai_no: form.icai_no,
        city: form.city,
        phone: form.phone,
        address: form.address,
        gst_no: form.gst_no,
      }).eq('user_id', user.id)

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      alert('Error saving: ' + e.message)
    }
    setSaving(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading profile…</p>
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
            <span className="text-sm font-normal text-gray-500 ml-2">Firm profile</span>
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-lg">
            ✓ Profile updated successfully
          </div>
        )}

        {/* Firm details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Firm details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Firm name</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                value={form.firm_name}
                onChange={e => setForm({ ...form, firm_name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">CA name</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                value={form.ca_name}
                onChange={e => setForm({ ...form, ca_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">ICAI number</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                value={form.icai_no}
                onChange={e => setForm({ ...form, icai_no: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">City</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Office address</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              GST number <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              placeholder="22AAAAA0000A1Z5"
              value={form.gst_no}
              onChange={e => setForm({ ...form, gst_no: e.target.value })} />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-700">
            ⚠️ Changes to firm name and address will reflect on all future invoices.
            Previously sent invoices are not affected.
          </p>
        </div>

      </div>
    </main>
  )
}