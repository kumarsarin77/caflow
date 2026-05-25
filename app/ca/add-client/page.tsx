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
  ],
  'Bookkeeping — FY 2024-25': [
    'Bank statements (all months)',
    'Cash book',
    'Purchase bills',
    'Sales invoices',
    'Expense vouchers'
  ]
}

type Engagement = {
  type: string
  period: string
  docs: string[]
}

export default function AddClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [firmId, setFirmId] = useState('')
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [showEngagementPicker, setShowEngagementPicker] = useState(false)
  const [newEngType, setNewEngType] = useState('ITR filing — AY 2025-26')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    pan: '',
  })

  useEffect(() => {
    loadFirm()
  }, [])

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

  function addEngagement() {
    const docs = engagementDocs[newEngType] || []
    const already = engagements.find(e => e.type === newEngType)
    if (already) {
      setError('This engagement type is already added')
      return
    }
    setEngagements(prev => [...prev, {
      type: newEngType,
      period: '',
      docs: [...docs]
    }])
    setShowEngagementPicker(false)
    setError('')
  }

  function removeEngagement(index: number) {
    setEngagements(prev => prev.filter((_, i) => i !== index))
  }

  function toggleDoc(engIndex: number, doc: string) {
    setEngagements(prev => prev.map((e, i) => {
      if (i !== engIndex) return e
      return {
        ...e,
        docs: e.docs.includes(doc)
          ? e.docs.filter(d => d !== doc)
          : [...e.docs, doc]
      }
    }))
  }

  async function handleAddClient() {
    if (!form.full_name || !form.email) {
      setError('Name and email are required')
      return
    }
    if (engagements.length === 0) {
      setError('Add at least one engagement')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          firm_id: firmId,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          pan: form.pan,
          engagement_type: engagements.map(e => e.type).join(', '),
          status: 'active'
        })
        .select()
        .single()

      if (clientError) throw clientError

      // Create each engagement and its documents
      for (const eng of engagements) {
        const { data: engData, error: engError } = await supabase
          .from('engagements')
          .insert({
            client_id: client.id,
            engagement_type: eng.type,
            period: eng.period,
            status: 'active'
          })
          .select()
          .single()

        if (engError) throw engError

        // Create documents for this engagement
        const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0]

        await supabase.from('documents').insert(
          eng.docs.map(name => ({
            client_id: client.id,
            engagement_id: engData.id,
            name,
            status: 'pending',
            due_date: dueDate
          }))
        )
      }

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

        {/* Client details */}
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
        </div>

        {/* Engagements */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-700">
              Engagements
              <span className="ml-2 text-xs text-gray-400 font-normal">
                (add one or more)
              </span>
            </h2>
            <button
              onClick={() => setShowEngagementPicker(true)}
              className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">
              + Add engagement
            </button>
          </div>

          {/* Engagement picker */}
          {showEngagementPicker && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Engagement type
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  value={newEngType}
                  onChange={e => setNewEngType(e.target.value)}>
                  {Object.keys(engagementDocs).map(e => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addEngagement}
                  className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
                  Add
                </button>
                <button
                  onClick={() => setShowEngagementPicker(false)}
                  className="text-xs border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {engagements.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-400 text-sm">No engagements added yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Click "+ Add engagement" to add ITR, GST, Audit etc.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {engagements.map((eng, engIndex) => (
                <div key={engIndex}
                  className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{eng.type}</p>
                      <p className="text-xs text-gray-400">
                        {eng.docs.length} documents
                      </p>
                    </div>
                    <button
                      onClick={() => removeEngagement(engIndex)}
                      className="text-xs text-red-500 hover:underline">
                      Remove
                    </button>
                  </div>
                  <div className="p-3 space-y-1">
                    {(engagementDocs[eng.type] || []).map(doc => (
                      <div
                        key={doc}
                        onClick={() => toggleDoc(engIndex, doc)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer
                          ${eng.docs.includes(doc)
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-white border border-gray-100'}`}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-xs
                          ${eng.docs.includes(doc)
                            ? 'bg-emerald-600 text-white'
                            : 'border border-gray-300'}`}>
                          {eng.docs.includes(doc) ? '✓' : ''}
                        </div>
                        <span className="text-xs text-gray-700">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleAddClient}
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
          {loading ? 'Adding client…' : '+ Add client & create checklists'}
        </button>
      </div>
    </main>
  )
}