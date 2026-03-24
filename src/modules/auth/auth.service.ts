import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../shared/errors/app-error";
import type { EmailService } from "../../shared/services/email.service";
import type { UsersRepository } from "../../shared/repositories/users.repository";

interface RegisterData {
  email: string;
  password: string;
  name: string;
  last_name: string;
  phone?: string;
  tax_id?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
}

export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private emailService: EmailService,
  ) {}

  async register(data: RegisterData) {
    const existing = await this.usersRepository.findByEmail(data.email);
    if (existing) throw new ConflictError("Email already registered");

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const verificationToken = crypto.randomUUID();

    const user = await this.usersRepository.create({
      email: data.email,
      hashedPassword,
      name: data.name,
      lastName: data.last_name,
      phone: data.phone ?? null,
      taxId: data.tax_id ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      country: data.country ?? null,
      zipCode: data.zip_code ?? null,
      verificationToken,
    });

    if (process.env.NODE_ENV !== "test") {
      await this.emailService.sendVerificationEmail(data.email, verificationToken);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      last_name: user.last_name,
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) throw new UnauthorizedError("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedError("Invalid email or password");

    if (process.env.NODE_ENV !== "test" && !user.email_verified) {
      throw new UnauthorizedError("Please verify your email before logging in");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async sendVerificationEmail(email: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) throw new NotFoundError("User not found");
    if (user.email_verified) throw new ConflictError("Email is already verified");

    const token = crypto.randomUUID();
    await this.usersRepository.setVerificationToken(user.id, token);
    await this.emailService.sendVerificationEmail(email, token);
  }

  async verifyEmail(token: string) {
    const user = await this.usersRepository.findByVerificationToken(token);
    if (!user) throw new NotFoundError("Invalid or expired verification token");
    await this.usersRepository.setVerified(user.id);
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findByEmail(email);
    // Não revelamos se o e-mail existe ou não
    if (!user) return;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await this.usersRepository.setPasswordResetToken(user.id, token, expiresAt);

    if (process.env.NODE_ENV !== "test") {
      await this.emailService.sendPasswordResetEmail(email, token);
    }
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersRepository.findByPasswordResetToken(token);
    if (!user) throw new NotFoundError("Invalid or expired reset token");

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.updatePassword(user.id, hashedPassword);
  }
}
