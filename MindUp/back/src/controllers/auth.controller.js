const usuarioModels = require("../models/usuario.model");
const passwordService = require("../services/password.services");
const { generateToken } = require("../services/auth.services");

module.exports = { login, registrar };

const PERFIS_PUBLICOS = ["usuario", "voluntario"];
const CAMPOS_OPCIONAIS = [
  "faixa_etaria_usr",
  "contato_usr",
  "cidade_usr",
  "estado_usr",
  "especialidade_vol",
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    }

    const usuario = await usuarioModels.findByEmail(email);

    if (!usuario) {
      return res.status(404).json({ error: "Usuário ou senha incorretos" });
    }

    const isPasswordValid = await passwordService.comparePassword(
      senha,
      usuario.senha_usr,
    );

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    const token = generateToken(usuario);
    res.json({ token });
  } catch (error) {
    next(error);
  }
}

// Cadastro público. Só permite criar perfis "usuario" e "voluntario":
// contas administrativas continuam sendo criadas por um admin logado
// em POST /usuario.
async function registrar(req, res, next) {
  try {
    const nome_usr =
      typeof req.body.nome_usr === "string" ? req.body.nome_usr.trim() : "";
    const email_usr =
      typeof req.body.email_usr === "string"
        ? req.body.email_usr.trim().toLowerCase()
        : "";
    const senha_usr = req.body.senha_usr;
    const perfil_usr = req.body.perfil_usr || "usuario";

    if (nome_usr.length < 3) {
      return res.status(400).json({
        error: "O nome deve ter pelo menos 3 caracteres",
      });
    }

    if (!EMAIL_REGEX.test(email_usr)) {
      return res.status(400).json({ error: "E-mail inválido" });
    }

    if (typeof senha_usr !== "string" || senha_usr.length < 8) {
      return res.status(400).json({
        error: "A senha deve ter pelo menos 8 caracteres",
      });
    }

    if (!PERFIS_PUBLICOS.includes(perfil_usr)) {
      return res.status(403).json({
        error: "Perfil não permitido no cadastro",
      });
    }

    const payload = { nome_usr, email_usr, senha_usr, perfil_usr };

    for (const campo of CAMPOS_OPCIONAIS) {
      const valor = req.body[campo];

      if (typeof valor === "string" && valor.trim()) {
        payload[campo] = valor.trim();
      }
    }

    if (perfil_usr !== "voluntario") {
      delete payload.especialidade_vol;
    }

    const id = await usuarioModels.create(payload);

    res.status(201).json({
      id,
      message: "Cadastro realizado com sucesso",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado" });
    }
    next(error);
  }
}
