import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')

    console.log('Clients found:', clients?.length, clientsError)

    if (!clients || clients.length === 0) {
      return NextResponse.json({ message: 'No clients found', results: [] })
    }

    for (const client of clients) {
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', client.id)
        .in('status', ['pending', 'overdue'])

      console.log(`Client ${client.full_name}: ${docs?.length} pending docs`, docsError)

      if (!docs || docs.length === 0) continue

      const maxDaysOverdue = Math.max(...docs.map((doc: any) => {
        const dueDate = new Date(doc.due_date)
        const diffTime = today.getTime() - dueDate.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }))

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

      const pendingList = docs.map((d: any) => `• ${d.name}`).join('\n')
      const prompt = `You are a CA firm assistant. Write a ${tone} email reminder (reminder ${escalationStep}) to client "${client.full_name}" for their ${client.engagement_type} filing.\n\nPending documents:\n${pendingList}\n\nUnder 120 words. Address by first name. Sign off as "CA Team". No markdown or asterisks.`

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

      // Send real email via Resend
      if (client.email) {
        const subjectByStep: Record<number, string> = {
          1: `Reminder: Documents pending for ${client.engagement_type}`,
          2: `Action needed: Overdue documents for ${client.engagement_type}`,
          3: `Urgent: Final reminder for ${client.engagement_type}`,
        }
        await resend.emails.send({
          from: 'CAFlow <onboarding@resend.dev>',
          to: client.email,
          subject: subjectByStep[escalationStep] || 'Document reminder from your CA',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #059669;">CAFlow — Document Reminder</h2>
              <p style="color: #374151; white-space: pre-line;">${message}</p>
              <div style="background: #f0fdf4; border: 1px solid #6ee7b7; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="color: #374151; font-weight: bold; margin: 0 0 8px;">Pending documents:</p>
                <ul style="color: #374151; margin: 0; padding-left: 20px;">
                  ${docs.map((d: any) => `<li>${d.name}</li>`).join('')}
                </ul>
              </div>
              <a href="https://caflow-delta.vercel.app/client/login"
                style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                Upload Documents →
              </a>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">CAFlow — Built for Indian CA firms</p>
            </div>
          `
        })
      }

      await supabase.from('followups').insert({
        client_id: client.id,
        channel: 'email',
        message,
        escalation_step: escalationStep,
        sent_at: new Date().toISOString()
      })

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
        email: client.email,
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