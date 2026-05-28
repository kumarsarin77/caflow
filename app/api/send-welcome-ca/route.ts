import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { email, ca_name, firm_name, firm_code } = await req.json()

  try {
    await resend.emails.send({
      from: 'CAFlow <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to CAFlow — Your firm is ready!',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #059669;">Welcome to CAFlow, ${ca_name}! 🎉</h2>
          <p style="color: #374151;">Your firm <strong>${firm_name}</strong> has been successfully registered.</p>
          <div style="background: #f0fdf4; border: 1px solid #6ee7b7; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 6px;">Your firm code — share this with your clients</p>
            <p style="color: #059669; font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 0;">${firm_code}</p>
          </div>
          <p style="color: #374151;">You can now:</p>
          <ul style="color: #374151;">
            <li>Add clients to your dashboard</li>
            <li>Assign document checklists</li>
            <li>Send AI-powered follow-up reminders</li>
          </ul>
          <a href="https://caflow-delta.vercel.app/ca/login" 
            style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
            Go to Dashboard →
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">CAFlow — Built for Indian CA firms</p>
        </div>
      `
    })

    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}