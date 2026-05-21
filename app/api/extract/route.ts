import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { fileUrl, documentName } = await req.json()

    // Fetch the file
    const fileResponse = await fetch(fileUrl)
    const fileBuffer = await fileResponse.arrayBuffer()
    const base64 = Buffer.from(fileBuffer).toString('base64')
    const contentType = fileResponse.headers.get('content-type') || 'application/pdf'

    const prompt = `You are a financial document analyzer for a CA firm in India.

Analyze this document called "${documentName}" and extract all important financial data.

Return ONLY a valid JSON object with these fields (use null if not found):
{
  "document_type": "type of document",
  "assessment_year": "AY XXXX-XX",
  "financial_year": "FY XXXX-XX",
  "person_name": "full name",
  "pan_number": "PAN",
  "employer_name": "company name",
  "gross_salary": "amount in rupees",
  "net_taxable_salary": "amount",
  "tds_deducted": "amount",
  "professional_tax": "amount",
  "pf_contribution": "amount",
  "standard_deduction": "amount",
  "bank_name": "bank name if applicable",
  "interest_income": "amount if applicable",
  "capital_gains": "amount if applicable",
  "total_income": "amount",
  "flags": ["list any mismatches, missing data, or issues found"]
}

Return ONLY the JSON. No explanation. No markdown.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [{
            type: 'document',
            source: {
              type: 'base64',
              media_type: contentType,
              data: base64
            }
          }, {
            type: 'text',
            text: prompt
          }]
        }]
      })
    })

    const data = await response.json()

    if (data.error) {
      // Fall back to Groq if Anthropic fails
      return await extractWithGroq(documentName)
    }

    const text = data.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(clean)

    return NextResponse.json({ extracted })

  } catch (e: any) {
    console.error('Extraction error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function extractWithGroq(documentName: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are a financial document analyzer. The document "${documentName}" was uploaded but could not be read directly. Based on the document name, return a JSON template with likely fields that need to be filled, with null values and a flag explaining the document needs manual review.

Return ONLY valid JSON:
{
  "document_type": "inferred from name",
  "assessment_year": null,
  "person_name": null,
  "pan_number": null,
  "employer_name": null,
  "gross_salary": null,
  "tds_deducted": null,
  "total_income": null,
  "flags": ["Document could not be auto-extracted. Please review manually."]
}`
      }],
      max_tokens: 500
    })
  })

  const data = await response.json()
  const text = data.choices[0].message.content
  const clean = text.replace(/```json|```/g, '').trim()
  const extracted = JSON.parse(clean)
  return NextResponse.json({ extracted })
}