import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { email, full_name, firm_name } = await req.json()

  try {
    await resend.emails.send({
      from: 'CAFlow <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to CAFlow — Your portal is ready!',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #2563eb;">Welcome to CAFlow, ${full_name}! 🎉</h2>
          <p style="color: #374151;">You have been successfully registered with <strong>${firm_name}</strong>.</p>
          <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #374151; margin: 0 0 8px;">Your document checklist is ready. You can now:</p>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>See exactly which documents your CA needs</li>
              <li>Upload files from your phone or laptop</li>
              <li>Track your submission progress live</li>
            </ul>
          </div>
          <a href="https://caflow-delta.vercel.app/client/login"
            style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
            Go to My Portal →
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