import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY ?? '')

export async function POST(req: Request) {
  const { invoice, client, firm } = await req.json()

  try {
    await resend.emails.send({
      from: 'CAFlow <onboarding@resend.dev>',
      to: client.email,
      subject: `Invoice ${invoice.invoice_number} from ${firm.firm_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
            <div>
              <h2 style="color: #059669; margin: 0 0 4px;">TAX INVOICE</h2>
              <p style="color: #6b7280; font-size: 13px; margin: 0;">${invoice.invoice_number}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 13px; color: #6b7280; margin: 0;">Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              ${invoice.due_date ? `<p style="font-size: 13px; color: #6b7280; margin: 4px 0 0;">Due: ${new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>` : ''}
            </div>
          </div>

          <!-- From / To -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
              <p style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">From</p>
              <p style="font-weight: 600; color: #111827; margin: 0 0 4px;">${firm.firm_name}</p>
              <p style="font-size: 13px; color: #374151; margin: 0 0 2px;">${firm.ca_name}</p>
              ${firm.address ? `<p style="font-size: 13px; color: #6b7280; margin: 0 0 2px;">${firm.address}</p>` : ''}
              ${firm.city ? `<p style="font-size: 13px; color: #6b7280; margin: 0 0 2px;">${firm.city}</p>` : ''}
              <p style="font-size: 13px; color: #6b7280; margin: 0 0 2px;">${firm.phone}</p>
              ${firm.gst_no ? `<p style="font-size: 13px; color: #6b7280; margin: 4px 0 0;">GSTIN: ${firm.gst_no}</p>` : ''}
            </div>
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
              <p style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">To</p>
              <p style="font-weight: 600; color: #111827; margin: 0 0 4px;">${client.full_name}</p>
              ${client.address ? `<p style="font-size: 13px; color: #6b7280; margin: 0 0 2px;">${client.address}</p>` : ''}
              <p style="font-size: 13px; color: #6b7280; margin: 0 0 2px;">${client.email}</p>
              ${client.gst_no ? `<p style="font-size: 13px; color: #6b7280; margin: 4px 0 0;">GSTIN: ${client.gst_no}</p>` : ''}
            </div>
          </div>

          <!-- Service table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="text-align: left; padding: 10px 12px; font-size: 12px; color: #6b7280; font-weight: 500;">Description</th>
                <th style="text-align: right; padding: 10px 12px; font-size: 12px; color: #6b7280; font-weight: 500;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px; font-size: 14px; color: #374151;">${invoice.service_description}</td>
                <td style="padding: 12px; text-align: right; font-size: 14px; color: #374151;">₹${invoice.amount?.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals -->
          <div style="margin-left: auto; max-width: 280px;">
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6b7280;">
              <span>Base amount</span>
              <span>₹${invoice.amount?.toLocaleString('en-IN')}</span>
            </div>
            ${invoice.gst_type === 'intrastate' ? `
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6b7280;">
              <span>CGST (9%)</span>
              <span>₹${(invoice.amount * 0.09).toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6b7280;">
              <span>SGST (9%)</span>
              <span>₹${(invoice.amount * 0.09).toLocaleString('en-IN')}</span>
            </div>
            ` : ''}
            ${invoice.gst_type === 'interstate' ? `
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6b7280;">
              <span>IGST (18%)</span>
              <span>₹${(invoice.amount * 0.18).toLocaleString('en-IN')}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; font-weight: 600; color: #111827; border-top: 2px solid #e5e7eb; margin-top: 4px;">
              <span>Total</span>
              <span style="color: #059669;">₹${invoice.total_amount?.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div style="margin-top: 32px; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #6ee7b7;">
            <p style="font-size: 13px; color: #065f46; margin: 0;">Please make payment by the due date. For any queries, contact us at ${firm.phone}.</p>
          </div>

          <p style="color: #9ca3af; font-size: 12px; margin-top: 32px; text-align: center;">
            Generated by CAFlow — Document & Invoice management for CA firms
          </p>
        </div>
      `
    })

    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}