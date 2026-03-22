import type { Request, Response } from "express";
import { z } from "zod";
import type { PaymentsService } from "./payments.service";

const checkoutSchema = z.object({
  order_id: z.number({ error: "order_id is required" }).int().positive(),
});

export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  checkout = async (req: Request, res: Response) => {
    const { order_id } = checkoutSchema.parse(req.body);
    const result = await this.paymentsService.createCheckout(order_id, req.user!.id);
    res.json({ data: result });
  };

  webhook = async (req: Request, res: Response) => {
    const signature = String(req.headers["x-webhook-signature"] ?? "");
    const secret = String(req.query.webhookSecret ?? "");
    const rawBody: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
    await this.paymentsService.handleWebhook(rawBody, signature, secret);
    res.status(200).send();
  };
}
