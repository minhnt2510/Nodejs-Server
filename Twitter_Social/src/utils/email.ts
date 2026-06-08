import nodemailer from 'nodemailer'
import { envConfig } from '~/constants/config'

const transporter = nodemailer.createTransport({
  service: envConfig.smtpService,
  auth: {
    user: envConfig.smtpUser,
    pass: envConfig.smtpPass
  }
})

export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  await transporter.sendMail({
    from: envConfig.smtpFrom,
    to,
    subject,
    html
  })
}

export const sendVerifyEmail = async (toAddress: string, email_verify_token: string, template?: string) => {
  const verifyLink = `${envConfig.clientUrl}/verify-email?token=${email_verify_token}`
  return sendEmail({
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
}

export const sendForgotPasswordEmail = async (toAddress: string, forgot_password_token: string, template?: string) => {
  const resetLink = `${envConfig.clientUrl}/forgot-password?token=${forgot_password_token}`
  return sendEmail({
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
}
