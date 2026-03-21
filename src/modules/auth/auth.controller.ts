import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthService } from "./auth.service";

const userSchema = z.object({
  email: z.string({ error: "Email is required" }).email("Invalid email"),
  password: z
    .string({ error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
});

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    const { email, password } = userSchema.parse(req.body);
    const user = await this.authService.register(email, password);
    res.status(201).json(user);
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = userSchema.parse(req.body);
    const result = await this.authService.login(email, password);
    res.json({ message: "Login successful", data: result });
  };
}
