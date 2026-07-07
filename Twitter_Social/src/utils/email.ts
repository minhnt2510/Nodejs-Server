import nodemailer from 'nodemailer'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { envConfig } from '~/constants/config'

// Khởi tạo SES Client nếu có đầy đủ thông tin xác thực AWS
let sesClient: SESClient | null = null
if (envConfig.awsAccessKeyId && envConfig.awsSecretAccessKey) {
  sesClient = new SESClient({
    region: envConfig.awsRegion,
    credentials: {
      accessKeyId: envConfig.awsAccessKeyId,
      secretAccessKey: envConfig.awsSecretAccessKey
    }
  })
}

const transporter = nodemailer.createTransport({
  // Khai báo tường minh thay vì dùng `service` để tránh resolve IPv6
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  family: 4,    // ← Ép dùng IPv4, tránh ENETUNREACH trên mạng không có IPv6
  auth: {
    user: envConfig.smtpUser,
    pass: envConfig.smtpPass
  }
} as any)

export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  // Nếu cấu hình AWS SES được kích hoạt và có email gửi đi, ưu tiên dùng SES (tránh bị chặn SMTP trên Cloud)
  if (sesClient && envConfig.sesFromAddress) {
    const command = new SendEmailCommand({
      Source: envConfig.sesFromAddress,
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8'
          }
        }
      }
    })
    await sesClient.send(command)
    return
  }

  // Fallback về Nodemailer SMTP nếu không cấu hình SES
  await transporter.sendMail({
    from: envConfig.smtpFrom,
    to,
    subject,
    html
  })
}

/**
 * Gửi email không chặn response (fire-and-forget).
 * Lỗi SMTP chỉ log ra console, không throw lên caller.
 */
export const sendEmailAsync = (args: { to: string; subject: string; html: string }) => {
  sendEmail(args).catch((err) => {
    console.error('[Email] Failed to send to', args.to, '-', err?.message ?? err)
  })
}

export const sendVerifyEmail = (toAddress: string, email_verify_token: string, template?: string) => {
  const verifyLink = `${envConfig.clientUrl}/verify-email?token=${email_verify_token}`
  sendEmailAsync({
    to: toAddress,
    subject: 'Xác thực email Twitter Clone',
    html: template || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #1da1f2;">Xác thực email của bạn</h2>
        <p>Chào mừng bạn đến với Twitter Clone! Vui lòng nhấn vào nút bên dưới để xác thực email:</p>
        <a href="${verifyLink}"
           style="display:inline-block;padding:12px 24px;background:#1da1f2;color:#fff;border-radius:4px;text-decoration:none;font-weight:bold;">
          Xác thực email
        </a>
        <p style="margin-top:20px;color:#888;">Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>
        <p>Link: <a href="${verifyLink}">${verifyLink}</a></p>
      </div>
    `
  })
  // fire-and-forget: không return Promise, không block response
}

export const sendForgotPasswordEmail = (toAddress: string, forgot_password_token: string, template?: string) => {
  const resetLink = `${envConfig.clientUrl}/forgot-password?token=${forgot_password_token}`
  sendEmailAsync({
    to: toAddress,
    subject: 'Đặt lại mật khẩu Twitter Clone',
    html: template || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #1da1f2;">Đặt lại mật khẩu</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào nút bên dưới để tiếp tục:</p>
        <a href="${resetLink}"
           style="display:inline-block;padding:12px 24px;background:#1da1f2;color:#fff;border-radius:4px;text-decoration:none;font-weight:bold;">
          Đặt lại mật khẩu
        </a>
        <p style="margin-top:20px;color:#888;">Link có hiệu lực trong 7 ngày. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        <p>Link: <a href="${resetLink}">${resetLink}</a></p>
      </div>
    `
  })
  // fire-and-forget: không return Promise, không block response
}
