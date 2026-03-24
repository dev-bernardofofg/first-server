import "dotenv/config";
import app from "./app";
import logger from "./shared/logger";

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info({ port: PORT }, "Server listening"));
