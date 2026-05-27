import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages, context, contextData } = await req.json()

    const systemPrompt = context === 'ca'
      ? `You are a concise assistant for a CA firm in India. Answer in 2-3 sentences maximum. Be direct and specific.

Real client data:
${contextData ? contextData : 'No client data available'}

Use only this real data. Never make up information. For overdue questions, check engagement_type and use these deadlines: ITR filing = July 31, GST Q4 = April 30, Audit = June 30. Today is ${new Date().toDateString()}.`
      : `You are a helpful assistant for a CA firm client in India. Help clients understand what documents they need, explain financial terms simply, and guide them through uploading. Be friendly and reassuring. Answer in plain text, no markdown.

Client data:
${contextData ? contextData : 'No client data available'}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 500
      })
    })

    const data = await response.json()
    const message = data.choices[0].message.content
    return NextResponse.json({ message })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}