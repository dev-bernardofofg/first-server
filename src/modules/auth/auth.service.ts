import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ConflictError, UnauthorizedError } from "../../shared/errors/app-error";
import type { UsersRepository } from "../../shared/repositories/users.repository";

interface RegisterData {
  email: string;
  password: string;
  name: string;
  last_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
}

export class AuthService {
  constructor(private usersRepository: UsersRepository) {}

  async register(data: RegisterData) {
    const existing = await this.usersRepository.findByEmail(data.email);
    if (existing) throw new ConflictError("Email already registered");

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersRepository.create({
      email: data.email,
      hashedPassword,
      name: data.name,
      lastName: data.last_name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      country: data.country ?? null,
      zipCode: data.zip_code ?? null,
    });

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
}
