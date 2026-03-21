import "dotenv/config";
import app from "./index";

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
