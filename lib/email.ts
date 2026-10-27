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

export interface BatchReminderEmailProps {
  to: string;
  cc?: string[];
  handlerName: string;
  userRole: "MANAGER" | "TEAM";
  isEscalation: boolean;
  requests: {
    sourceNo: string;
    sourceDate: string; // formatted date string
    noOfDays: number;
    stageOrStatus: string;
    id: string;
  }[];
  baseUrl: string;
}

export async function sendBatchReminderEmail({ to, cc, handlerName, userRole, isEscalation, requests, baseUrl }: BatchReminderEmailProps) {
  if (!process.env.SMTP_USER && process.env.NODE_ENV === 'production') {
    console.warn("SMTP credentials not configured. Skipping email.");
    return false;
  }

  const rolePath = userRole === "MANAGER" ? "manager" : "team";

  const subject = isEscalation
    ? `[Urgent] ${requests.length} Source Request(s) Require Immediate Action`
    : `Daily Reminder: ${requests.length} Pending Source Request(s) Awaiting Action`;

  const requestRows = requests.map(req => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
        <a href="${baseUrl}/${rolePath}/requests/${req.id}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${req.sourceNo}</a>
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">
        ${req.sourceDate}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: ${req.noOfDays > 40 ? '#ef4444' : req.noOfDays > 21 ? '#f59e0b' : '#64748b'}; font-weight: ${req.noOfDays > 21 ? 'bold' : 'normal'};">
        ${req.noOfDays} days
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
        <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #475569;">${req.stageOrStatus}</span>
      </td>
    </tr>
  `).join('');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
      <!-- Header -->
      <div style="background: ${isEscalation ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)'}; padding: 28px 32px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">
          ${isEscalation ? '⚠️ Urgent: Severely Overdue Requests' : '🔔 Daily Procurement Reminder'}
        </h2>
        <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">
          ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <!-- Body -->
      <div style="padding: 28px 32px;">
        <p style="color: #1e293b; margin: 0 0 8px;">Hello <strong>${handlerName}</strong>,</p>
        <p style="color: #475569; margin: 0 0 24px; line-height: 1.6;">
          The following <strong>${requests.length}</strong> Source Request(s) assigned to you ${isEscalation ? 'are <strong style="color:#ef4444">severely overdue</strong> and require immediate escalation' : 'have exceeded 21 days and require your attention'}. This reminder will be sent daily until each request is completed.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px; text-align: left; font-size: 14px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Source No</th>
              <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Source Date</th>
              <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Total Days</th>
              <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Stage / Status</th>
            </tr>
          </thead>
          <tbody>
            ${requestRows}
          </tbody>
        </table>


        <p style="color: #475569; margin: 0 0 24px; line-height: 1.6;">
          Please click on the Source Numbers above to open and update each request in the Procurement System.
        </p>

        <a href="${baseUrl}/${rolePath}/requests" style="display: inline-block; background: ${isEscalation ? '#ef4444' : '#4f46e5'}; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          View All My Requests →
        </a>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          This is an automated daily reminder from the Procurement Management System. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Procurement System" <noreply@procurement.com>',
      to,
      cc,
      subject,
      html: htmlContent,
    });

    console.log("-----------------------------------------");
    console.log("Batch Email Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    console.log("-----------------------------------------");

    return true;
  } catch (error) {
    console.error("Error sending batch email:", error);
    return false;
  }
}

export interface RfqInvitationEmailProps {
  to: string;
  vendorName: string;
  rfqNumber: string;
  sourceNo: string;
  title: string;
  specifications?: string | null;
  quantity?: number | null;
  unit?: string | null;
  submissionDeadline: string;
  deliveryLocation?: string | null;
  accessKey: string;
  vendorPortalUrl?: string;
}

export async function sendRfqInvitationEmail({
  to,
  vendorName,
  rfqNumber,
  sourceNo,
  title,
  specifications,
  quantity,
  unit,
  submissionDeadline,
  deliveryLocation,
  accessKey,
  vendorPortalUrl = process.env.VENDOR_PORTAL_URL || process.env.NEXT_PUBLIC_VENDOR_PORTAL_URL || "https://www.dxnmanufacturing.com",
}: RfqInvitationEmailProps) {
  if (!process.env.SMTP_USER && process.env.NODE_ENV === "production") {
    console.warn("SMTP credentials not configured. Skipping vendor RFQ email.");
    return false;
  }

  const directSubmitUrl = `${vendorPortalUrl}/vendor/rfqs/${accessKey}`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <!-- Header -->
      <div style="background: #0f172a; padding: 24px 32px; border-bottom: 3px solid #dc2626;">
        <div style="color: #ef4444; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;">
          DXN Manufacturing India · Procurement Department
        </div>
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">
          Request for Quotation (RFQ)
        </h1>
        <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px; font-family: monospace;">
          Reference: ${rfqNumber} (Source: ${sourceNo})
        </p>
      </div>

      <!-- Main Body -->
      <div style="padding: 32px;">
        <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px;">
          Dear <strong>${vendorName}</strong>,
        </p>
        <p style="color: #475569; margin: 0 0 24px; line-height: 1.6; font-size: 14px;">
          DXN Manufacturing India Pvt. Ltd. invites your esteemed organization to submit a commercial quotation for the procurement requirement detailed below:
        </p>

        <!-- Details Card -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">Subject / Title:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${title}</td>
            </tr>
            ${quantity ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Required Quantity:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${quantity} ${unit || "Units"}</td>
            </tr>
            ` : ""}
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Submission Deadline:</td>
              <td style="padding: 6px 0; color: #dc2626; font-weight: bold;">${new Date(submissionDeadline).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</td>
            </tr>
            ${deliveryLocation ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Delivery Plant:</td>
              <td style="padding: 6px 0; color: #0f172a;">${deliveryLocation}</td>
            </tr>
            ` : ""}
            ${specifications ? `
            <tr>
              <td style="padding: 10px 0 4px 0; color: #64748b; font-weight: 600; vertical-align: top;">Specifications:</td>
              <td style="padding: 10px 0 4px 0; color: #334155; line-height: 1.5; white-space: pre-wrap;">${specifications}</td>
            </tr>
            ` : ""}
          </table>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${directSubmitUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);">
            Submit Quotation Online →
          </a>
          <p style="color: #64748b; font-size: 12px; margin: 12px 0 0;">
            ✓ <strong>No login or password needed.</strong> This secure link opens directly to your company's submission form.
          </p>
        </div>

        <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
          If the button above does not open, please copy and paste this direct link into your browser:<br />
          <a href="${directSubmitUrl}" style="color: #dc2626; word-break: break-all;">${directSubmitUrl}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          DXN Manufacturing India Pvt. Ltd. · Sy. No. 138 & 139, Mandapally Village, Siddipet, Telangana 502277<br />
          This is an official automated transmission from the DXN Procurement Portal.
        </p>
      </div>
    </div>
  `;

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"DXN Procurement" <dxn15553@gmail.com>',
      to,
      subject: `[RFQ Invitation] ${rfqNumber}: ${title} - DXN Manufacturing India`,
      html: htmlContent,
    });

    console.log("RFQ Invitation Email sent to %s (MsgId: %s)", to, info.messageId);
    return true;
  } catch (error) {
    console.error(`Error sending RFQ invitation email to ${to}:`, error);
    return false;
  }
}

