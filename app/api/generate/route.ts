import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    })

    const data = await response.json()
    console.log('Groq response:', JSON.stringify(data))

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    const message = data.choices[0].message.content
    return NextResponse.json({ message })

  } catch (e: any) {
    console.error('Error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}