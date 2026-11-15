const agendamentoModel = require("../models/agendamento.model");
const disponibilidadeModel = require("../models/disponibilidade.model");
const { isValidObjectId, sameId } = require("../utils/mongoose");

module.exports = {
  create,
  findByvoluntarioId,
  findByUsuarioId,
  confirmarAgendamento,
  desconfirmarAgendamento,
  cancelarAgendamento,
  deleteAgendamento,
};

async function create(req, res, next) {
  try {
    const { id_dis, descricao_agn } = req.body;

    if (!isValidObjectId(id_dis)) {
      return res.status(400).json({ error: "Disponibilidade inválida" });
    }

    const id = await agendamentoModel.create({
      id_usr: req.user.id,
      id_dis,
      descricao_agn,
    });

    res.status(201).json({ data: { id } });
  } catch (error) {
    next(error);
  }
}

async function findByvoluntarioId(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    if (!sameId(req.user.id, req.params.id)) {
      return res.status(403).json({
        error: "Você não tem permissão para acessar estes agendamentos",
      });
    }

    const agendamentos = await agendamentoModel.findByvoluntarioId(
      req.params.id,
    );

    if (!agendamentos.length) {
      return res.status(404).json({
        error: "Nenhum agendamento encontrado",
      });
    }

    res.json(agendamentos);
  } catch (error) {
    next(error);
  }
}

async function findByUsuarioId(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    if (!sameId(req.user.id, req.params.id)) {
      return res.status(403).json({
        error: "Você não tem permissão para acessar estes agendamentos",
      });
    }

    const agendamentos = await agendamentoModel.findByUsuarioId(
      req.params.id,
    );

    if (!agendamentos.length) {
      return res.status(404).json({
        error: "Nenhum agendamento encontrado",
      });
    }

    res.json(agendamentos);
  } catch (error) {
    next(error);
  }
}

async function confirmarAgendamento(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const agendamento = await agendamentoModel.findById(req.params.id);

    if (!agendamento) {
      return res.status(404).json({
        error: "Agendamento não encontrado",
      });
    }

    const disponibilidade = await disponibilidadeModel.findById(
      agendamento.id_dis,
    );

    if (!disponibilidade) {
      return res.status(404).json({
        error: "Disponibilidade não encontrada",
      });
    }

    if (!sameId(req.user.id, disponibilidade.id_vol)) {
      return res.status(403).json({
        error: "Você não tem permissão para confirmar este agendamento",
      });
    }

    await agendamentoModel.confirmarAgendamento(req.params.id);

    res.json({ message: "Agendamento confirmado com sucesso" });
  } catch (error) {
    next(error);
  }
}

async function desconfirmarAgendamento(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const agendamento = await agendamentoModel.findById(req.params.id);

    if (!agendamento) {
      return res.status(404).json({
        error: "Agendamento não encontrado",
      });
    }

    const disponibilidade = await disponibilidadeModel.findById(
      agendamento.id_dis,
    );

    if (!disponibilidade) {
      return res.status(404).json({
        error: "Disponibilidade não encontrada",
      });
    }

    if (!sameId(req.user.id, disponibilidade.id_vol)) {
      return res.status(403).json({
        error: "Você não tem permissão para desconfirmar este agendamento",
      });
    }

    await agendamentoModel.desconfirmarAgendamento(req.params.id);

    res.json({ message: "Agendamento desconfirmado com sucesso" });
  } catch (error) {
    next(error);
  }
}

async function cancelarAgendamento(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const agendamento = await agendamentoModel.findById(req.params.id);

    if (!agendamento) {
      return res.status(404).json({
        error: "Agendamento não encontrado",
      });
    }

    const disponibilidade = await disponibilidadeModel.findById(
      agendamento.id_dis,
    );

    if (!disponibilidade) {
      return res.status(404).json({
        error: "Disponibilidade não encontrada",
      });
    }

    const isUsuario = sameId(req.user.id, agendamento.id_usr);
    const isVoluntario = sameId(req.user.id, disponibilidade.id_vol);

    if (!isUsuario && !isVoluntario) {
      return res.status(403).json({
        error: "Você não tem permissão para cancelar este agendamento",
      });
    }

    await agendamentoModel.cancelarAgendamento(req.params.id);

    res.json({ message: "Agendamento cancelado com sucesso" });
  } catch (error) {
    next(error);
  }
}

async function deleteAgendamento(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const agendamento = await agendamentoModel.findById(req.params.id);

    if (!agendamento) {
      return res.status(404).json({
        error: "Agendamento não encontrado",
      });
    }

    if (!sameId(req.user.id, agendamento.id_usr)) {
      return res.status(403).json({
        error: "Você não tem permissão para excluir este agendamento",
      });
    }

    await agendamentoModel.delete(req.params.id);

    res.json({ message: "Agendamento deletado com sucesso" });
  } catch (error) {
    next(error);
  }
}
