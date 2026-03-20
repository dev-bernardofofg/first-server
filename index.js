require("dotenv").config();

const express = require("express");
const contatosRouter = require("./routes/contatos");
const authRouter = require("./routes/auth");
const auth = require("./middlewares/auth");
const erroHandler = require("./middlewares/erro");

const app = express();
app.use(express.json());

// router contato
app.use("/auth", authRouter);
app.use("/contatos", auth, contatosRouter);
app.use(erroHandler);

module.exports = app;
