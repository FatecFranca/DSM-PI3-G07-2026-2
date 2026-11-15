const disponibilidadeModels = require("../models/disponibilidade.model");
const { validadeConflito } = require("../services/disponibilidade.services");
const { isValidObjectId, sameId } = require("../utils/mongoose");

module.exports = {
  create,
  findByvoluntarioId,
  findMyDisponibilidades,
  findAllDisponiveis,
  update,
  cancelarDisponibilidade,
  reativarDisponibilidade,
  delete: deleteDisponibilidade,
};

function toMinutes(time) {
  if (typeof time !== "string" || !/^\d{1,2}:\d{2}$/.test(time)) {
    return NaN;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    return NaN;
  }

  return hours * 60 + minutes;
}

function dataExiste(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return false;
  }

  const [ano, mes, dia] = data.split("-").map(Number);
  const date = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    date.getUTCFullYear() === ano &&
    date.getUTCMonth() === mes - 1 &&
    date.getUTCDate() === dia
  );
}

function validarHorario(data) {
  if (!data.data_dis || !data.hora_ini_dis || !data.hora_fim_dis) {
    return "Data e horários são obrigatórios";
  }

  if (!dataExiste(data.data_dis)) {
    return "Data inválida";
  }

  const inicio = toMinutes(data.hora_ini_dis);
  const fim = toMinutes(data.hora_fim_dis);

  if (Number.isNaN(inicio) || Number.isNaN(fim)) {
    return "Horário inválido";
  }

  const diferenca = fim - inicio;

  if (inicio >= fim) {
    return "O horário de início deve ser anterior ao horário de fim";
  }

  if (diferenca < 15) {
    return "O intervalo mínimo é de 15 minutos";
  }

  if (diferenca > 60) {
    return "O intervalo máximo é de 1 hora";
  }

  return null;
}

async function create(req, res, next) {
  try {
    const erroHorario = validarHorario(req.body);

    if (erroHorario) {
      return res.status(400).json({ error: erroHorario });
    }

    const data = {
      id_vol: req.user.id,
      data_dis: req.body.data_dis,
      hora_ini_dis: req.body.hora_ini_dis,
      hora_fim_dis: req.body.hora_fim_dis,
    };

    if (
      await validadeConflito(
        data.id_vol,
        data.data_dis,
        data.hora_ini_dis,
        data.hora_fim_dis,
      )
    ) {
      return res.status(400).json({
        error: "Já existe um horário cadastrado para esse período",
      });
    }

    const id = await disponibilidadeModels.create(data);
    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
}

async function findByvoluntarioId(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const disponibilidades = await disponibilidadeModels.findByvoluntarioId(
      req.params.id,
    );

    if (!disponibilidades.length) {
      return res.status(404).json({
        error: "Nenhuma disponibilidade encontrada",
      });
    }

    res.json(disponibilidades);
  } catch (error) {
    next(error);
  }
}

async function findAllDisponiveis(req, res, next) {
  try {
    const disponibilidades =
      await disponibilidadeModels.findAllDisponiveis();

    if (!disponibilidades.length) {
      return res.status(404).json({
        error: "Nenhuma disponibilidade encontrada",
      });
    }

    res.json(disponibilidades);
  } catch (error) {
    next(error);
  }
}

async function findMyDisponibilidades(req, res, next) {
  try {
    const disponibilidades =
      await disponibilidadeModels.findMyDisponibilidades(req.user.id);

    res.json(disponibilidades);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const erroHorario = validarHorario(req.body);

    if (erroHorario) {
      return res.status(400).json({ error: erroHorario });
    }

    const disponibilidade = await disponibilidadeModels.findById(
      req.params.id,
    );

    if (!disponibilidade) {
      return res.status(404).json({
        error: "Disponibilidade não encontrada",
      });
    }

    if (!sameId(disponibilidade.id_vol, req.user.id)) {
      return res.status(403).json({
        error: "Você não tem permissão para alterar esta disponibilidade",
      });
    }

    if (
      await validadeConflito(
        disponibilidade.id_vol,
        req.body.data_dis,
        req.body.hora_ini_dis,
        req.body.hora_fim_dis,
        req.params.id,
      )
    ) {
      return res.status(400).json({
        error: "Já existe um horário cadastrado para esse período",
      });
    }

    const count = await disponibilidadeModels.update(req.params.id, {
      data_dis: req.body.data_dis,
      hora_ini_dis: req.body.hora_ini_dis,
      hora_fim_dis: req.body.hora_fim_dis,
    });

    if (count === 0) {
      return res.status(404).json({
        error: "Disponibilidade não encontrada",
      });
    }

    res.status(200).json({
      message: "Disponibilidade atualizada com sucesso",
    });
  } catch (error) {
    next(error);
  }
}

async function cancelarDisponibilidade(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const disponibilidade = await disponibilidadeModels.findById(
      req.params.id,
    );

    if (!disponibilidade) {
      return res.status(404).json({
        error: "Disponibilidade não encontrada",
      });
    }

    if (!sameId(disponibilidade.id_vol, req.user.id)) {
      return res.status(403).json({
        error: "Você não tem permissão para cancelar esta disponibilidade",
      });
    }

    await disponibilidadeModels.update(req.params.id, {
      status_dis: "cancelado",
    });

    res.status(200).json({
      message: "Disponibilidade cancelada com sucesso",
    });
  } catch (error) {
    next(error);
  }
}

async function reativarDisponibilidade(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const disponibilidade = await disponibilidadeModels.findById(
      req.params.id,
    );

    if (!disponibilidade) {
      return res.status(404).json({
        error: "Disponibilidade não encontrada",
      });
    }

    if (!sameId(disponibilidade.id_vol, req.user.id)) {
      return res.status(403).json({
        error: "Você não tem permissão para reativar esta disponibilidade",
      });
    }

    await disponibilidadeModels.update(req.params.id, {
      status_dis: "disponivel",
    });

    res.status(200).json({
      message: "Disponibilidade reativada com sucesso",
    });
  } catch (error) {
    next(error);
  }
}

async function deleteDisponibilidade(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const disponibilidade = await disponibilidadeModels.findById(
      req.params.id,
    );

    if (!disponibilidade) {
      return res.status(404).json({
        error: "Disponibilidade não encontrada",
      });
    }

    if (!sameId(disponibilidade.id_vol, req.user.id)) {
      return res.status(403).json({
        error: "Você não tem permissão para remover esta disponibilidade",
      });
    }

    await disponibilidadeModels.delete(req.params.id);

    res.status(200).json({
      message: "Disponibilidade removida com sucesso",
    });
  } catch (error) {
    next(error);
  }
}
