const usuarioModels = require("../models/usuario.model");
const { isValidObjectId, sameId } = require("../utils/mongoose");

const CAMPOS_USUARIO = [
  "nome_usr",
  "email_usr",
  "senha_usr",
  "faixa_etaria_usr",
  "perfil_usr",
  "especialidade_vol",
  "contato_usr",
  "cidade_usr",
  "estado_usr",
];

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteUsuario,
};

function podeGerenciar(req, id) {
  return req.user.perfil === "admin" || sameId(req.user.id, id);
}

function selecionarCampos(data) {
  return CAMPOS_USUARIO.reduce((payload, campo) => {
    if (data[campo] !== undefined) {
      payload[campo] = data[campo];
    }
    return payload;
  }, {});
}

async function getAll(req, res, next) {
  try {
    const usuarios = await usuarioModels.findAll();
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const usuario = await usuarioModels.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(usuario);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const payload = selecionarCampos(req.body);

    if (!payload.nome_usr || !payload.email_usr || !payload.senha_usr) {
      return res.status(400).json({
        error: "Nome, e-mail e senha são obrigatórios",
      });
    }

    if (payload.perfil_usr === "admin" && req.user.perfil !== "admin") {
      return res.status(403).json({
        error: "Apenas administradores podem criar outro administrador",
      });
    }

    const id = await usuarioModels.create(payload);
    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    if (!podeGerenciar(req, req.params.id)) {
      return res.status(403).json({
        error: "Você não tem permissão para alterar este usuário",
      });
    }

    const payload = selecionarCampos(req.body);

    if (!Object.keys(payload).length) {
      return res.status(400).json({
        error: "Nenhum campo válido para atualizar",
      });
    }

    if (payload.perfil_usr && req.user.perfil !== "admin") {
      return res.status(403).json({
        error: "Apenas administradores podem alterar o perfil",
      });
    }

    const count = await usuarioModels.update(req.params.id, payload);

    if (count === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({ message: "Usuário atualizado com sucesso" });
  } catch (error) {
    next(error);
  }
}

async function deleteUsuario(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    if (!podeGerenciar(req, req.params.id)) {
      return res.status(403).json({
        error: "Você não tem permissão para deletar este usuário",
      });
    }

    const count = await usuarioModels.delete(req.params.id);

    if (count === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    next(error);
  }
}
