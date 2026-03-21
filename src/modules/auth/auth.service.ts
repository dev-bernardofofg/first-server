import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ConflictError, UnauthorizedError } from "../../shared/errors/app-error";
import type { UsersRepository } from "../../shared/repositories/users.repository";

export class AuthService {
  constructor(private usersRepository: UsersRepository) {}

  async register(email: string, password: string) {
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) throw new ConflictError("Email already registered");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersRepository.create(email, hashedPassword);
    return { id: user.id, email: user.email };
  }

  async login(email: string, password: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) throw new UnauthorizedError("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedError("Invalid email or password");

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );

    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
