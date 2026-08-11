import nodemailer from 'nodemailer';

let testAccount: nodemailer.TestAccount | null = null;

async function getTransporter() {
  if (process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to auto-generated Ethereal account for local testing
  if (!testAccount) {
    testAccount = await nodemailer.createTestAccount();
  }
  
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

interface ReminderEmailProps {
  to: string;
  handlerName: string;
  sourceNo: string;
  pendingDays: number;
  currentStage: string;
}

export async function sendReminderEmail({ to, handlerName, sourceNo, pendingDays, currentStage }: ReminderEmailProps) {
  if (!process.env.SMTP_USER && process.env.NODE_ENV === 'production') {
    console.warn("SMTP credentials not configured. Skipping email.");
    return false;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Action Required: Overdue Source Request</h2>
      <p>Hello <strong>${handlerName}</strong>,</p>
      <p>This is an automated reminder that a Source Request assigned to you is currently incomplete and has exceeded its SLA threshold.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="margin-bottom: 8px;"><strong>Source No:</strong> ${sourceNo}</li>
          <li style="margin-bottom: 8px;"><strong>Pending Days:</strong> ${pendingDays}</li>
          <li><strong>Current Stage:</strong> ${currentStage}</li>
        </ul>
      </div>
      
      <p>Please log in to the Procurement System to update the status of this request as soon as possible.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #64748b;">
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>
  `;

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Procurement System" <noreply@procurement.com>',
      to,
      subject: `Action Required: Source Request ${sourceNo} is Overdue`,
      html: htmlContent,
    });
    
    console.log("-----------------------------------------");
    console.log("Email Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    console.log("-----------------------------------------");
    
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
