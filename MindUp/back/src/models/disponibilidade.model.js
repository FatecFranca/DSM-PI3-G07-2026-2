const mongoose = require("mongoose");
const {
  legacyIdTransform,
  toObjectId,
  sessionOptions,
  useSession,
} = require("../utils/mongoose");
const { withTransaction } = require("../services/transaction.services");

function normalizeTime(value) {
  if (typeof value !== "string") return value;

  const [hour, minute] = value.split(":");
  if (hour == null || minute == null) return value;

  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

const disponibilidadeSchema = new mongoose.Schema(
  {
    id_vol: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    data_dis: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    hora_ini_dis: {
      type: String,
      required: true,
      set: normalizeTime,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    hora_fim_dis: {
      type: String,
      required: true,
      set: normalizeTime,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    status_dis: {
      type: String,
      enum: ["disponivel", "pendente", "ocupado", "cancelado"],
      default: "disponivel",
      index: true,
    },
  },
  {
    collection: "disponibilidade",
    toJSON: {
      virtuals: true,
      transform: legacyIdTransform("id_dis"),
    },
    toObject: {
      virtuals: true,
      transform: legacyIdTransform("id_dis"),
    },
  },
);

disponibilidadeSchema.index({
  id_vol: 1,
  data_dis: 1,
  status_dis: 1,
});

const DisponibilidadeModel = mongoose.model(
  "Disponibilidade",
  disponibilidadeSchema,
);

const Disponibilidade = {
  model: DisponibilidadeModel,

  async create(data) {
    const disponibilidade = await DisponibilidadeModel.create(data);
    return disponibilidade._id;
  },

  async findByvoluntarioId(id) {
    const idVol = toObjectId(id);
    if (!idVol) return [];

    return DisponibilidadeModel.aggregate([
      { $match: { id_vol: idVol } },
      {
        $lookup: {
          from: "usuario",
          localField: "id_vol",
          foreignField: "_id",
          as: "voluntario",
        },
      },
      { $unwind: "$voluntario" },
      { $match: { "voluntario.perfil_usr": "voluntario" } },
      {
        $project: {
          _id: 1,
          id_dis: { $toString: "$_id" },
          id_vol: 1,
          data_dis: 1,
          hora_ini_dis: 1,
          hora_fim_dis: 1,
          status_dis: 1,
        },
      },
      { $sort: { data_dis: 1, hora_ini_dis: 1 } },
    ]);
  },

  async findAllDisponiveis() {
    return DisponibilidadeModel.aggregate([
      { $match: { status_dis: "disponivel" } },
      {
        $lookup: {
          from: "usuario",
          localField: "id_vol",
          foreignField: "_id",
          as: "voluntario",
        },
      },
      { $unwind: "$voluntario" },
      { $match: { "voluntario.perfil_usr": "voluntario" } },
      {
        $project: {
          _id: 1,
          id_dis: { $toString: "$_id" },
          id_vol: 1,
          data_dis: 1,
          hora_ini_dis: 1,
          hora_fim_dis: 1,
          status_dis: 1,
          nome_usr: "$voluntario.nome_usr",
          especialidade_vol: "$voluntario.especialidade_vol",
          contato_usr: "$voluntario.contato_usr",
        },
      },
      { $sort: { data_dis: 1, hora_ini_dis: 1 } },
    ]);
  },

  findById(id, session) {
    return useSession(DisponibilidadeModel.findById(id), session);
  },

  findMyDisponibilidades(id) {
    return DisponibilidadeModel.find({ id_vol: id }).sort({
      data_dis: 1,
      hora_ini_dis: 1,
    });
  },

  findConflitos(id_vol, data, hora_ini, hora_fim, excludeId) {
    const filter = {
      id_vol,
      data_dis: data,
      hora_ini_dis: { $lt: hora_fim },
      hora_fim_dis: { $gt: hora_ini },
      status_dis: { $ne: "cancelado" },
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    return DisponibilidadeModel.find(filter);
  },

  async update(id, data) {
    const { _id, __v, id_vol, ...payload } = data;

    const result = await DisponibilidadeModel.updateOne(
      { _id: id },
      payload,
      { runValidators: true },
    );

    return result.matchedCount;
  },

  async updateStatus(id, status, session, extraFilter = {}) {
    return DisponibilidadeModel.findOneAndUpdate(
      { _id: id, ...extraFilter },
      { $set: { status_dis: status } },
      { returnDocument: "after", ...sessionOptions(session) },
    );
  },

  updateManyStatus(ids, status, session) {
    return DisponibilidadeModel.updateMany(
      { _id: { $in: ids } },
      { $set: { status_dis: status } },
      sessionOptions(session),
    );
  },

  delete(id) {
    // O MySQL removia os agendamentos vinculados via ON DELETE CASCADE.
    // Mantém o mesmo comportamento no MongoDB.
    const Agendamento = require("./agendamento.model");

    return withTransaction(async (session) => {
      await Agendamento.model.deleteMany(
        { id_dis: id },
        sessionOptions(session),
      );

      const result = await DisponibilidadeModel.deleteOne(
        { _id: id },
        sessionOptions(session),
      );

      return result.deletedCount;
    });
  },

  deleteByVolunteerId(id, session) {
    return DisponibilidadeModel.deleteMany(
      { id_vol: id },
      sessionOptions(session),
    );
  },
};

module.exports = Disponibilidade;
