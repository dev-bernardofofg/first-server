import "dotenv/config";
import express from "express";
import contatosRouter from "./routes/contatos";
import authRouter from "./routes/auth";
import auth from "./middlewares/auth";
import erroHandler from "./middlewares/erro";

const app = express();
app.use(express.json());

app.use("/auth", authRouter);
app.use("/contatos", auth, contatosRouter);
app.use(erroHandler);

export default app;
