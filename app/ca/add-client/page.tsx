'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const engagementDocs: Record<string, string[]> = {
  'ITR filing — AY 2025-26': [
    'Form 16 (salary)',
    'Bank interest certificate',
    'Home loan statement',
    'Capital gains statement',
    '80C investment proofs',
    'Rent receipts',
    'Aadhar & PAN copy'
  ],
  'GST returns — Q4 FY25-26': [
    'Purchase invoices (Q4)',
    'Sales invoices (Q4)',
    'E-way bills summary',
    'Credit notes register',
    'RCM details'
  ],
  'Statutory audit — FY 2024-25': [
    'Trial balance (March)',
    'Bank reconciliation statement',
    'Fixed asset register',
    'Debtors & creditors list',
    'Stock valuation report',
    'Board resolutions',
    'Related party disclosures',
    'Statutory registers'
  ],
  'TDS/TCS filing': [
    'Salary register',
    'TDS challan details',
    'Form 16A copies',
    'Vendor payment details'
  ],
  'GST + TDS combined': [
    'Purchase vouchers',
    'Contractor payment details',
    'TDS certificates received',
    'GST invoices (Q4)'
  ]
}

export default function AddClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [firmId, setFirmId] = useState('')
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    pan: '',
    engagement_type: 'ITR filing — AY 2025-26'
  })

  useEffect(() => {
    loadFirm()
  }, [])

  useEffect(() => {
    setSelectedDocs(engagementDocs[form.engagement_type] || [])
  }, [form.engagement_type])

  async function loadFirm() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/ca/login'); return }

    const { data: firm } = await supabase
      .from('firms')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (firm) setFirmId(firm.id)
  }

  function toggleDoc(doc: string) {
    setSelectedDocs(prev =>
      prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]
    )
  }

  async function handleAddClient() {
    if (!form.full_name || !form.email) {
      setError('Name and email are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          firm_id: firmId,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          pan: form.pan,
          engagement_type: form.engagement_type,
          status: 'active'
        })
        .select()
        .single()

      if (clientError) throw clientError

      // Add document checklist
      const dueDates: Record<string, string> = {}
      const docs = selectedDocs.map(name => ({
        client_id: client.id,
        name,
        status: 'pending',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0]
      }))

      await supabase.from('documents').insert(docs)

      router.push('/ca/dashboard')
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/ca/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <h1 className="text-lg font-medium text-gray-900">Add new client</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 mb-4">
          <h2 className="text-sm font-medium text-gray-700">Client details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Full name *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Client full name"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">PAN number</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="ABCDE1234F"
                value={form.pan}
                onChange={e => setForm({ ...form, pan: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Email *</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="client@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Phone (WhatsApp)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="+91 XXXXX XXXXX"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Engagement type</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              value={form.engagement_type}
              onChange={e => setForm({ ...form, engagement_type: e.target.value })}>
              {Object.keys(engagementDocs).map(e => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Document checklist
            <span className="text-xs text-gray-400 font-normal ml-2">
              (auto-filled based on engagement — edit as needed)
            </span>
          </h2>
          <div className="space-y-2">
            {(engagementDocs[form.engagement_type] || []).map(doc => (
              <div
                key={doc}
                onClick={() => toggleDoc(doc)}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-all
                  ${selectedDocs.includes(doc)
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-gray-100 bg-gray-50'}`}>
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-xs
                  ${selectedDocs.includes(doc)
                    ? 'bg-emerald-600 text-white'
                    : 'border border-gray-300'}`}>
                  {selectedDocs.includes(doc) ? '✓' : ''}
                </div>
                <span className="text-sm text-gray-700">{doc}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleAddClient}
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
          {loading ? 'Adding client…' : '+ Add client & create checklist'}
        </button>
      </div>
    </main>
  )
}