const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || "Erro interno do servidor";

  if (err.name === "CastError") {
    status = 400;
    message = "ID inválido";
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field
      ? `Já existe um registro com este ${field}`
      : "Registro duplicado";
  }

  if (status >= 500) {
    console.error("Erro:", err);
  }

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
