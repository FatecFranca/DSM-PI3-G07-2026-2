const conversaModel = require("../models/conversa.model");
const usuarioModel = require("../models/usuario.model");
const { isValidObjectId, sameId } = require("../utils/mongoose");

module.exports = {
  criarConversa,
  getMinhasConversas,
  getConversaById,
};

async function criarConversa(req, res, next) {
  try {
    const id_usr = req.user.id;
    const { id_vol } = req.body;

    if (!isValidObjectId(id_vol)) {
      return res.status(400).json({ error: "ID do voluntário é obrigatório" });
    }

    if (sameId(id_usr, id_vol)) {
      return res.status(400).json({
        error: "Você não pode iniciar uma conversa consigo mesmo",
      });
    }

    const voluntario = await usuarioModel.findById(id_vol);

    if (!voluntario || voluntario.perfil_usr !== "voluntario") {
      return res.status(400).json({ error: "Voluntário não encontrado" });
    }

    const conversaExistente =
      await conversaModel.findByUsuarioAndVoluntario(id_usr, id_vol);

    if (conversaExistente) {
      return res.status(400).json({
        error: "Já existe uma conversa entre este usuário e voluntário",
      });
    }

    try {
      const id_con = await conversaModel.create({ id_usr, id_vol });
      res.status(201).json({ id_con });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          error: "Já existe uma conversa entre este usuário e voluntário",
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
}

async function getMinhasConversas(req, res, next) {
  try {
    let conversas;

    if (req.user.perfil === "voluntario") {
      conversas = await conversaModel.findByVoluntarioId(req.user.id);
    } else {
      conversas = await conversaModel.findByUsuarioId(req.user.id);
    }

    // Lista vazia é um resultado válido, não um erro.
    res.json(conversas);
  } catch (error) {
    next(error);
  }
}

async function getConversaById(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const conversa = await conversaModel.findById(req.params.id);

    if (!conversa) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    if (
      !sameId(req.user.id, conversa.id_usr) &&
      !sameId(req.user.id, conversa.id_vol)
    ) {
      return res.status(403).json({
        error: "Você não tem permissão para acessar esta conversa",
      });
    }

    res.json(conversa);
  } catch (error) {
    next(error);
  }
}
