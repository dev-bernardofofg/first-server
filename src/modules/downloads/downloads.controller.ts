import type { Request, Response } from "express";
import type { DownloadsService } from "./downloads.service";

export class DownloadsController {
  constructor(private downloadsService: DownloadsService) {}

  download = async (req: Request, res: Response) => {
    const result = await this.downloadsService.getDownload(String(req.params.token));
    res.json({ data: result });
  };
}
