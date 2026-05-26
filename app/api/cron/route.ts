import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const today = new Date()
    const results: any[] = []

    // Get all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')

    console.log('Clients found:', clients?.length, clientsError)

    if (!clients || clients.length === 0) {
      return NextResponse.json({ message: 'No clients found', results: [] })
    }

    for (const client of clients) {
      // Get pending documents for this client
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', client.id)
        .in('status', ['pending', 'overdue'])

      console.log(`Client ${client.full_name}: ${docs?.length} pending docs`, docsError)

      if (!docs || docs.length === 0) continue

      // Calculate max days overdue
      const maxDaysOverdue = Math.max(...docs.map((doc: any) => {
        const dueDate = new Date(doc.due_date)
        const diffTime = today.getTime() - dueDate.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }))

      console.log(`Max days overdue: ${maxDaysOverdue}`)

      let escalationStep = 0
      let tone = ''

      if (maxDaysOverdue >= 14) {
        escalationStep = 3
        tone = 'very urgent — third and final reminder, mention serious filing deadline risk'
      } else if (maxDaysOverdue >= 7) {
        escalationStep = 2
        tone = 'firm and professional — second reminder, documents are overdue'
      } else if (maxDaysOverdue >= 3) {
        escalationStep = 1
        tone = 'polite and friendly — first gentle reminder'
      } else {
        results.push({ client: client.full_name, status: 'not due yet', daysOverdue: maxDaysOverdue })
        continue
      }

      // Check if already sent this step today
      const { data: recentFollowup } = await supabase
        .from('followups')
        .select('*')
        .eq('client_id', client.id)
        .eq('escalation_step', escalationStep)
        .gte('sent_at', new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString())

      if (recentFollowup && recentFollowup.length > 0) {
        results.push({ client: client.full_name, status: 'already sent today', step: escalationStep })
        continue
      }

      // Generate message
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

      // Log followup
      await supabase.from('followups').insert({
        client_id: client.id,
        channel: 'whatsapp',
        message,
        escalation_step: escalationStep,
        sent_at: new Date().toISOString()
      })

      // Update document status and followup count
      for (const doc of docs) {
        await supabase
          .from('documents')
          .update({
            followup_count: (doc.followup_count || 0) + 1,
            status: maxDaysOverdue >= 7 ? 'overdue' : doc.status
          })
          .eq('id', doc.id)
      }

      results.push({
        client: client.full_name,
        status: 'reminder sent ✓',
        step: escalationStep,
        daysOverdue: maxDaysOverdue,
        message: message.slice(0, 80) + '...'
      })
    }

    return NextResponse.json({
      message: `Processed ${clients.length} clients`,
      results
    })

  } catch (e: any) {
    console.error('Cron error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}