const mensagemModel = require("../models/mensagem.model");
const conversaModel = require("../models/conversa.model");
const { isValidObjectId, sameId } = require("../utils/mongoose");

module.exports = {
  getHistorico,
  marcarComoVisualizada,
};

async function getHistorico(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id_con)) {
      return res.status(400).json({ error: "ID da conversa inválido" });
    }

    const conversa = await conversaModel.findById(req.params.id_con);

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

    const mensagens = await mensagemModel.findByConversaId(
      req.params.id_con,
    );

    res.json(mensagens);
  } catch (error) {
    next(error);
  }
}

async function marcarComoVisualizada(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id_men)) {
      return res.status(400).json({ error: "ID da mensagem inválido" });
    }

    const mensagem = await mensagemModel.findById(req.params.id_men);

    if (!mensagem) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    const conversa = await conversaModel.findById(mensagem.id_con);

    if (!conversa) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    if (
      !sameId(req.user.id, conversa.id_usr) &&
      !sameId(req.user.id, conversa.id_vol)
    ) {
      return res.status(403).json({
        error: "Você não tem permissão para acessar esta mensagem",
      });
    }

    await mensagemModel.marcarComoVisualizada(req.params.id_men);

    res.json({ message: "Mensagem marcada como visualizada" });
  } catch (error) {
    next(error);
  }
}
