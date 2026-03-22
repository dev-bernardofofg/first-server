import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthService } from "./auth.service";

const registerSchema = z.object({
  email: z.string({ error: "Email is required" }).email("Invalid email"),
  password: z
    .string({ error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
  name: z.string({ error: "Name is required" }).min(1, "Name is required"),
  last_name: z
    .string({ error: "Last name is required" })
    .min(1, "Last name is required"),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zip_code: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string({ error: "Email is required" }).email("Invalid email"),
  password: z
    .string({ error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
});

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);
    const user = await this.authService.register(data);
    res.status(201).json({ data: user });
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await this.authService.login(email, password);
    res.json({ data: result });
  };
}
