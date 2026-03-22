import { NotFoundError, ValidationError } from "../../shared/errors/app-error";
import type { DownloadsRepository } from "./downloads.repository";

export class DownloadsService {
  constructor(private downloadsRepository: DownloadsRepository) {}

  async getDownload(token: string) {
    const item = await this.downloadsRepository.findByToken(token);
    if (!item) throw new NotFoundError("Invalid download token");

    if (new Date() > new Date(item.token_expires_at)) {
      throw new ValidationError("Download token has expired");
    }

    if (item.download_count >= item.max_downloads) {
      throw new ValidationError("Download limit reached");
    }

    await this.downloadsRepository.incrementCount(item.id);

    return { file_url: item.file_url };
  }
}
