const mongoose = require("mongoose");
const Disponibilidade = require("./disponibilidade.model");
const { AppError } = require("../utils/errors");
const {
  legacyIdTransform,
  toObjectId,
  sessionOptions,
  useSession,
  sameId,
} = require("../utils/mongoose");
const { withTransaction } = require("../services/transaction.services");

const agendamentoSchema = new mongoose.Schema(
  {
    id_usr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    // Campo denormalizado para facilitar as consultas por voluntário.
    id_vol: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    id_dis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Disponibilidade",
      required: true,
      index: true,
    },
    descricao_agn: { type: String },
    status_agn: {
      type: String,
      enum: ["pendente", "confirmado", "cancelado"],
      default: "pendente",
      index: true,
    },
    criado_em: { type: Date, default: Date.now },
  },
  {
    collection: "agendamento",
    toJSON: {
      virtuals: true,
      transform: legacyIdTransform("id_agn"),
    },
    toObject: {
      virtuals: true,
      transform: legacyIdTransform("id_agn"),
    },
  },
);

const AgendamentoModel = mongoose.model("Agendamento", agendamentoSchema);

const Agendamento = {
  model: AgendamentoModel,

  create(data) {
    return withTransaction(async (session) => {
      const disponibilidade = await Disponibilidade.updateStatus(
        data.id_dis,
        "pendente",
        session,
        { status_dis: "disponivel" },
      );

      if (!disponibilidade) {
        const existe = await Disponibilidade.findById(data.id_dis, session);
        if (!existe) {
          throw new AppError("Disponibilidade não encontrada", 404);
        }
        throw new AppError("Disponibilidade não disponível", 400);
      }

      try {
        const [agendamento] = await AgendamentoModel.create(
          [
            {
              id_usr: data.id_usr,
              id_vol: disponibilidade.id_vol,
              id_dis: disponibilidade._id,
              descricao_agn: data.descricao_agn,
              status_agn: "pendente",
            },
          ],
          sessionOptions(session),
        );

        return agendamento._id;
      } catch (error) {
        // Em mongod standalone não há transação para desfazer o status.
        if (!session) {
          await Disponibilidade.updateStatus(
            data.id_dis,
            "disponivel",
            null,
          );
        }
        throw error;
      }
    });
  },

  findById(id, session) {
    return useSession(AgendamentoModel.findById(id), session);
  },

  async findByvoluntarioId(id) {
    const idVol = toObjectId(id);
    if (!idVol) return [];

    return AgendamentoModel.aggregate([
      { $match: { id_vol: idVol } },
      {
        $lookup: {
          from: "disponibilidade",
          localField: "id_dis",
          foreignField: "_id",
          as: "disponibilidade",
        },
      },
      { $unwind: "$disponibilidade" },
      {
        $lookup: {
          from: "usuario",
          localField: "id_usr",
          foreignField: "_id",
          as: "usuario",
        },
      },
      { $unwind: "$usuario" },
      {
        $project: {
          _id: 1,
          id_agn: { $toString: "$_id" },
          id_usr: 1,
          id_vol: 1,
          id_dis: 1,
          descricao_agn: 1,
          status_agn: 1,
          criado_em: 1,
          data_dis: "$disponibilidade.data_dis",
          hora_ini_dis: "$disponibilidade.hora_ini_dis",
          hora_fim_dis: "$disponibilidade.hora_fim_dis",
          nome_usr: "$usuario.nome_usr",
        },
      },
      { $sort: { data_dis: 1, hora_ini_dis: 1 } },
    ]);
  },

  async findByUsuarioId(id) {
    const idUsr = toObjectId(id);
    if (!idUsr) return [];

    return AgendamentoModel.aggregate([
      { $match: { id_usr: idUsr } },
      {
        $lookup: {
          from: "disponibilidade",
          localField: "id_dis",
          foreignField: "_id",
          as: "disponibilidade",
        },
      },
      { $unwind: "$disponibilidade" },
      {
        $lookup: {
          from: "usuario",
          localField: "id_vol",
          foreignField: "_id",
          as: "usuario",
        },
      },
      { $unwind: "$usuario" },
      {
        $project: {
          _id: 1,
          id_agn: { $toString: "$_id" },
          id_usr: 1,
          id_vol: 1,
          id_dis: 1,
          descricao_agn: 1,
          status_agn: 1,
          criado_em: 1,
          data_dis: "$disponibilidade.data_dis",
          hora_ini_dis: "$disponibilidade.hora_ini_dis",
          hora_fim_dis: "$disponibilidade.hora_fim_dis",
          nome_usr: "$usuario.nome_usr",
        },
      },
      { $sort: { data_dis: 1, hora_ini_dis: 1 } },
    ]);
  },

  confirmarAgendamento(id_agn) {
    return withTransaction(async (session) => {
      const agendamento = await Agendamento.findById(id_agn, session);

      if (!agendamento) {
        throw new AppError("Agendamento não encontrado", 404);
      }

      if (agendamento.status_agn !== "pendente") {
        throw new AppError(
          "Não é possível confirmar um agendamento que não está pendente",
          400,
        );
      }

      const disponibilidade = await Disponibilidade.updateStatus(
        agendamento.id_dis,
        "ocupado",
        session,
        { status_dis: "pendente" },
      );

      if (!disponibilidade) {
        throw new AppError("Disponibilidade não está pendente", 400);
      }

      agendamento.status_agn = "confirmado";

      try {
        await agendamento.save(sessionOptions(session));
      } catch (error) {
        if (!session) {
          await Disponibilidade.updateStatus(
            agendamento.id_dis,
            "pendente",
            null,
          );
        }
        throw error;
      }
    });
  },

  desconfirmarAgendamento(id_agn) {
    return withTransaction(async (session) => {
      const agendamento = await Agendamento.findById(id_agn, session);

      if (!agendamento) {
        throw new AppError("Agendamento não encontrado", 404);
      }

      if (agendamento.status_agn !== "confirmado") {
        throw new AppError(
          "Não é possível desconfirmar um agendamento que não está confirmado",
          400,
        );
      }

      const disponibilidade = await Disponibilidade.updateStatus(
        agendamento.id_dis,
        "pendente",
        session,
        { status_dis: "ocupado" },
      );

      if (!disponibilidade) {
        throw new AppError("Disponibilidade não está ocupada", 400);
      }

      agendamento.status_agn = "pendente";

      try {
        await agendamento.save(sessionOptions(session));
      } catch (error) {
        if (!session) {
          await Disponibilidade.updateStatus(
            agendamento.id_dis,
            "ocupado",
            null,
          );
        }
        throw error;
      }
    });
  },

  cancelarAgendamento(id_agn) {
    return withTransaction(async (session) => {
      const agendamento = await Agendamento.findById(id_agn, session);

      if (!agendamento) {
        throw new AppError("Agendamento não encontrado", 404);
      }

      if (agendamento.status_agn === "cancelado") {
        throw new AppError("Agendamento já cancelado", 400);
      }

      const disponibilidade = await Disponibilidade.findById(
        agendamento.id_dis,
        session,
      );

      if (!disponibilidade) {
        throw new AppError("Disponibilidade não encontrada", 404);
      }

      const statusAnterior = disponibilidade.status_dis;

      await Disponibilidade.updateStatus(
        agendamento.id_dis,
        "disponivel",
        session,
      );

      agendamento.status_agn = "cancelado";

      try {
        await agendamento.save(sessionOptions(session));
      } catch (error) {
        if (!session && statusAnterior) {
          await Disponibilidade.updateStatus(
            agendamento.id_dis,
            statusAnterior,
            null,
          );
        }
        throw error;
      }
    });
  },

  delete(id_agn) {
    return withTransaction(async (session) => {
      const agendamento = await Agendamento.findById(id_agn, session);

      if (!agendamento) {
        throw new AppError("Agendamento não encontrado", 404);
      }

      const disponibilidade = await Disponibilidade.findById(
        agendamento.id_dis,
        session,
      );

      if (!disponibilidade) {
        throw new AppError("Disponibilidade não encontrada", 404);
      }

      const statusAnterior = disponibilidade.status_dis;

      await Disponibilidade.updateStatus(
        agendamento.id_dis,
        "disponivel",
        session,
      );

      try {
        const result = await AgendamentoModel.deleteOne(
          { _id: id_agn },
          sessionOptions(session),
        );

        if (result.deletedCount === 0) {
          throw new AppError("Agendamento não encontrado", 404);
        }

        return result.deletedCount;
      } catch (error) {
        if (!session && statusAnterior) {
          await Disponibilidade.updateStatus(
            agendamento.id_dis,
            statusAnterior,
            null,
          );
        }
        throw error;
      }
    });
  },

  async deleteByUserId(id, session) {
    const agendamentos = await useSession(
      AgendamentoModel.find({
        $or: [{ id_usr: id }, { id_vol: id }],
      }),
      session,
    );

    const disponibilidadesDoUsuario = agendamentos
      .filter((agendamento) => sameId(agendamento.id_usr, id))
      .map((agendamento) => agendamento.id_dis);

    if (disponibilidadesDoUsuario.length) {
      await Disponibilidade.updateManyStatus(
        disponibilidadesDoUsuario,
        "disponivel",
        session,
      );
    }

    const result = await AgendamentoModel.deleteMany(
      {
        $or: [{ id_usr: id }, { id_vol: id }],
      },
      sessionOptions(session),
    );

    return result.deletedCount;
  },
};

module.exports = Agendamento;
