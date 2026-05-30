'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ClientProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [newFirmCode, setNewFirmCode] = useState('')
  const [clientId, setClientId] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    pan: '',
    address: '',
    gst_no: '',
    employment_type: '',
    employer_name: '',
    annual_income: '',
  })

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/client/login'); return }

    const { data: client } = await supabase
      .from('clients').select('*').eq('user_id', user.id).single()

    if (client) {
      setClientId(client.id)
      setForm({
        full_name: client.full_name || '',
        phone: client.phone || '',
        pan: client.pan || '',
        address: client.address || '',
        gst_no: client.gst_no || '',
        employment_type: client.employment_type || '',
        employer_name: client.employer_name || '',
        annual_income: client.annual_income || '',
      })
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('clients').update({
        full_name: form.full_name,
        phone: form.phone,
        pan: form.pan,
        address: form.address,
        gst_no: form.gst_no,
        employment_type: form.employment_type,
        employer_name: form.employer_name,
        annual_income: form.annual_income,
      }).eq('user_id', user.id)

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      alert('Error saving: ' + e.message)
    }
    setSaving(false)
  }

  async function handleTransfer() {
    if (!newFirmCode.trim()) {
      alert('Please enter a firm code')
      return
    }
    setTransferring(true)
    try {
      const { data: newFirm, error: firmError } = await supabase
        .from('firms')
        .select('*')
        .eq('firm_code', newFirmCode.toUpperCase())
        .single()

      if (firmError || !newFirm) {
        alert('Invalid firm code. Please check and try again.')
        setTransferring(false)
        return
      }

      await supabase.from('clients')
        .update({ firm_id: newFirm.id })
        .eq('id', clientId)

      alert(`Successfully transferred to ${newFirm.firm_name}!`)
      setShowTransfer(false)
      setNewFirmCode('')
    } catch (e: any) {
      alert('Transfer failed: ' + e.message)
    }
    setTransferring(false)
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
          <button onClick={() => router.push('/client/portal')}
            className="text-sm text-gray-500 hover:text-gray-700">← Portal</button>
          <h1 className="text-lg font-medium text-gray-900">
            CA<span className="text-emerald-600">Flow</span>
            <span className="text-sm font-normal text-gray-500 ml-2">My profile</span>
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {saved && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm p-3 rounded-lg">
            ✓ Profile updated successfully
          </div>
        )}

        {/* Personal details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Personal details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Full name</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">PAN number</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={form.pan}
                onChange={e => setForm({ ...form, pan: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                GST number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="22AAAAA0000A1Z5"
                value={form.gst_no}
                onChange={e => setForm({ ...form, gst_no: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Address</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>

        {/* Employment details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Employment details</h2>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Employment type</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              value={form.employment_type}
              onChange={e => setForm({ ...form, employment_type: e.target.value })}>
              <option>Salaried</option>
              <option>Self-employed</option>
              <option>Professional</option>
              <option>Retired</option>
              <option>NRI</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Employer name</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={form.employer_name}
                onChange={e => setForm({ ...form, employer_name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Annual income</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={form.annual_income}
                onChange={e => setForm({ ...form, annual_income: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Transfer CA */}
        <div className="bg-white border border-amber-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-medium text-gray-700">Transfer to a new CA</h2>
              <p className="text-xs text-gray-400 mt-1">
                Enter your new CA's firm code to transfer. All your documents and history will move to the new CA.
              </p>
            </div>
            <button
              onClick={() => setShowTransfer(!showTransfer)}
              className="text-sm text-amber-600 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50">
              {showTransfer ? 'Cancel' : 'Transfer'}
            </button>
          </div>
          {showTransfer && (
            <div className="mt-4 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">
                  ⚠️ Once transferred, your current CA will no longer have access to your data.
                </p>
              </div>
              <div className="flex gap-3">
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 uppercase"
                  placeholder="Enter new firm code"
                  value={newFirmCode}
                  onChange={e => setNewFirmCode(e.target.value)} />
                <button
                  onClick={handleTransfer}
                  disabled={transferring}
                  className="bg-amber-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-600 disabled:opacity-50">
                  {transferring ? 'Transferring…' : 'Confirm transfer'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}