import { Resend } from "resend";

export class EmailService {
  private from: string;

  constructor() {
    this.from = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";
  }

  private getClient(): Resend {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    return new Resend(process.env.RESEND_API_KEY);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.getClient().emails.send({
      from: this.from,
      to,
      subject: "Reset your password",
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, you can ignore this email.</p>
      `,
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await this.getClient().emails.send({
      from: this.from,
      to,
      subject: "Confirm your email address",
      html: `
        <h2>Welcome!</h2>
        <p>Please confirm your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Confirm Email</a>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, you can ignore this email.</p>
      `,
    });
  }
}
