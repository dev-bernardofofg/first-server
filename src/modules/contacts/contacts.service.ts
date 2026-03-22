import { NotFoundError } from "../../shared/errors/app-error";
import type { ContactsRepository } from "./contacts.repository";

export class ContactsService {
  constructor(private contactsRepository: ContactsRepository) {}

  async getAll() {
    return this.contactsRepository.findAll();
  }

  async getById(id: number) {
    const contact = await this.contactsRepository.findById(id);
    if (!contact) throw new NotFoundError("Contact not found");
    return contact;
  }

  async create(name: string, lastName: string) {
    return this.contactsRepository.create(name, lastName);
  }

  async update(id: number, name: string, lastName: string) {
    const contact = await this.contactsRepository.update(id, name, lastName);
    if (!contact) throw new NotFoundError("Contact not found");
    return contact;
  }

  async delete(id: number) {
    const contact = await this.contactsRepository.delete(id);
    if (!contact) throw new NotFoundError("Contact not found");
  }
}
