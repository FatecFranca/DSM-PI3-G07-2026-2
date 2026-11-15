// middleware de rotas com acess token JWT
const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res
      .status(401)
      .json({ error: "Token de autenticação não fornecido" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token de autenticação inválido" });
  }
  try {
    const secretKey = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' })
    }
    return res.status(401).json({ error: 'Token inválido' })
}
}

module.exports = authenticate;
