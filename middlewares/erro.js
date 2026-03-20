function erroHandler(err, req, res, next) {
  console.error(err);

  if(err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({ erro: "Dados inválidos ou duplicados" });
  }

  res.status(500).json({ erro: "Erro interno do servidor" });
}

module.exports = erroHandler;