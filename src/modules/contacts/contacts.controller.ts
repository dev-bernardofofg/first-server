import type { Request, Response } from "express";
import { z } from "zod";
import type { ContactsService } from "./contacts.service";

const idSchema = z.coerce.number().int().positive();

const contactSchema = z.object({
  name: z.string({ error: "Name is required" }).min(1, "Name is required"),
  last_name: z
    .string({ error: "Last name is required" })
    .min(1, "Last name is required"),
});

export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  getAll = async (req: Request, res: Response) => {
    const contacts = await this.contactsService.getAll();
    res.json({ data: contacts });
  };

  getById = async (req: Request, res: Response) => {
    const contact = await this.contactsService.getById(idSchema.parse(req.params.id));
    res.json({ data: contact });
  };

  create = async (req: Request, res: Response) => {
    const { name, last_name } = contactSchema.parse(req.body);
    const contact = await this.contactsService.create(name, last_name);
    res.status(201).json({ data: contact });
  };

  update = async (req: Request, res: Response) => {
    const { name, last_name } = contactSchema.parse(req.body);
    const contact = await this.contactsService.update(
      idSchema.parse(req.params.id),
      name,
      last_name,
    );
    res.json({ data: contact });
  };

  delete = async (req: Request, res: Response) => {
    await this.contactsService.delete(idSchema.parse(req.params.id));
    res.status(204).send();
  };
}
