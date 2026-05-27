import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages, context, contextData } = await req.json()

    const systemPrompt = context === 'ca'
      ? `You are an intelligent assistant for a CA firm in India. You help the CA manage client document collection, follow-ups, and filing deadlines. You know about ITR filing, GST returns, statutory audits, TDS, and Indian tax law. Be concise, professional, and helpful. Answer in plain text, no markdown.

Here is the real client data for this CA firm:
${contextData ? contextData : 'No client data available'}

Always use this real data when answering questions about clients. Never make up client names or details.`
      : `You are a helpful assistant for a CA firm's client in India. You help clients understand what documents they need to submit, explain financial terms simply, and guide them through the document upload process. Be friendly, simple, and reassuring. Answer in plain text, no markdown.

Here is the client's data:
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