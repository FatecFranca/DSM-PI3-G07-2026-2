const jwt = require("jsonwebtoken");

module.exports = { generateToken };

function generateToken(user) {
  const payload = {
    id: user._id ? user._id.toString() : String(user.id_usr),
    email: user.email_usr,
    perfil: user.perfil_usr,
  };

  const secretKey = process.env.JWT_SECRET;
  const options = {
    expiresIn: "1h",
  };

  return jwt.sign(payload, secretKey, options);
}
