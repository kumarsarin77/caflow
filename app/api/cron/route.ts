import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(req: NextRequest) {
  try {
    // Verify this is called by Vercel cron
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const results: any[] = []

    // Get all pending and overdue documents with client info
    const { data: documents } = await supabase
      .from('documents')
      .select(`
        *,
        clients (
          id,
          full_name,
          email,
          phone,
          engagement_type,
          firm_id
        )
      `)
      .in('status', ['pending', 'overdue'])

    if (!documents || documents.length === 0) {
      return NextResponse.json({ message: 'No pending documents', results: [] })
    }

    // Group documents by client
    const clientDocs: Record<string, any> = {}
    for (const doc of documents) {
      if (!doc.clients) continue
      const clientId = doc.clients.id
      if (!clientDocs[clientId]) {
        clientDocs[clientId] = {
          client: doc.clients,
          docs: []
        }
      }
      clientDocs[clientId].docs.push(doc)
    }

    // Process each client
    for (const clientId of Object.keys(clientDocs)) {
      const { client, docs } = clientDocs[clientId]

      // Calculate max days overdue
      const maxDaysOverdue = Math.max(...docs.map((doc: any) => {
        const dueDate = new Date(doc.due_date)
        const diffTime = today.getTime() - dueDate.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }))

      // Determine escalation step
      let escalationStep = 0
      let tone = ''
      if (maxDaysOverdue >= 14) {
        escalationStep = 3
        tone = 'very urgent — third and final reminder, mention serious filing deadline risk and consequences'
      } else if (maxDaysOverdue >= 7) {
        escalationStep = 2
        tone = 'firm and professional — second reminder, clearly state documents are overdue'
      } else if (maxDaysOverdue >= 3) {
        escalationStep = 1
        tone = 'polite and friendly — first gentle reminder'
      } else {
        continue // Not overdue enough yet
      }

      // Check if we already sent this escalation step today
      const { data: recentFollowup } = await supabase
        .from('followups')
        .select('*')
        .eq('client_id', clientId)
        .eq('escalation_step', escalationStep)
        .gte('sent_at', new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .single()

      if (recentFollowup) {
        results.push({
          client: client.full_name,
          status: 'skipped — already sent today',
          step: escalationStep
        })
        continue
      }

      // Generate message using Groq
      const pendingList = docs.map((d: any) => `• ${d.name}`).join('\n')
      const prompt = `You are a CA firm assistant. Write a ${tone} WhatsApp reminder (reminder ${escalationStep}) to client "${client.full_name}" for their ${client.engagement_type} filing.\n\nPending documents:\n${pendingList}\n\nUnder 100 words. Address by first name. Sign off as "CA Team". No markdown or asterisks.`

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300
        })
      })

      const groqData = await groqRes.json()
      const message = groqData.choices?.[0]?.message?.content || 'Reminder: Please submit your pending documents.'

      // Log the followup
      await supabase.from('followups').insert({
        client_id: clientId,
        channel: 'whatsapp',
        message,
        escalation_step: escalationStep,
        sent_at: new Date().toISOString()
      })

      // Update document followup count
      await supabase
        .from('documents')
        .update({
          followup_count: docs[0].followup_count + 1,
          status: maxDaysOverdue >= 7 ? 'overdue' : 'pending'
        })
        .eq('client_id', clientId)
        .in('status', ['pending', 'overdue'])

      results.push({
        client: client.full_name,
        status: 'reminder sent',
        step: escalationStep,
        daysOverdue: maxDaysOverdue,
        message: message.slice(0, 100) + '...'
      })
    }

    return NextResponse.json({
      message: `Processed ${Object.keys(clientDocs).length} clients`,
      results
    })

  } catch (e: any) {
    console.error('Cron error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}