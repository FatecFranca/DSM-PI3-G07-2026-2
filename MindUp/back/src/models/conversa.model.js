const mongoose = require("mongoose");
const {
  legacyIdTransform,
  sessionOptions,
  toObjectId,
  useSession,
} = require("../utils/mongoose");

const conversaSchema = new mongoose.Schema(
  {
    id_usr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    id_vol: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    criada_em: { type: Date, default: Date.now },
    ultima_mensagem: { type: String },
  },
  {
    collection: "conversas",
    toJSON: {
      virtuals: true,
      transform: legacyIdTransform("id_con"),
    },
    toObject: {
      virtuals: true,
      transform: legacyIdTransform("id_con"),
    },
  },
);

conversaSchema.index({ id_usr: 1, id_vol: 1 }, { unique: true });

const ConversaModel = mongoose.model("Conversa", conversaSchema);

// A listagem de conversas inclui os nomes dos participantes para que o
// frontend não precise buscar cada usuário separadamente.
function listarComParticipantes(filtro) {
  return ConversaModel.aggregate([
    { $match: filtro },
    {
      $lookup: {
        from: "usuario",
        localField: "id_usr",
        foreignField: "_id",
        as: "usuario",
      },
    },
    {
      $lookup: {
        from: "usuario",
        localField: "id_vol",
        foreignField: "_id",
        as: "voluntario",
      },
    },
    { $unwind: { path: "$usuario", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$voluntario", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        id_con: { $toString: "$_id" },
        id_usr: 1,
        id_vol: 1,
        criada_em: 1,
        ultima_mensagem: 1,
        usuario_nome: "$usuario.nome_usr",
        voluntario_nome: "$voluntario.nome_usr",
        voluntario_especialidade: "$voluntario.especialidade_vol",
      },
    },
    { $sort: { criada_em: -1 } },
  ]);
}

const Conversa = {
  model: ConversaModel,

  async create(data) {
    const conversa = await ConversaModel.create(data);
    return conversa._id;
  },

  findByUsuarioId(id) {
    const idUsr = toObjectId(id);
    if (!idUsr) return Promise.resolve([]);

    return listarComParticipantes({ id_usr: idUsr });
  },

  findByVoluntarioId(id) {
    const idVol = toObjectId(id);
    if (!idVol) return Promise.resolve([]);

    return listarComParticipantes({ id_vol: idVol });
  },

  findById(id) {
    return ConversaModel.findById(id);
  },

  findByUsuarioAndVoluntario(id_usr, id_vol) {
    return ConversaModel.findOne({ id_usr, id_vol });
  },

  atualizarUltimaMensagem(id_con, mensagem) {
    return ConversaModel.updateOne(
      { _id: id_con },
      { $set: { ultima_mensagem: mensagem } },
    );
  },

  findByParticipantId(id, session) {
    const filter = {
      $or: [{ id_usr: id }, { id_vol: id }],
    };

    return useSession(ConversaModel.find(filter), session);
  },

  deleteByParticipantId(id, session) {
    return ConversaModel.deleteMany(
      {
        $or: [{ id_usr: id }, { id_vol: id }],
      },
      sessionOptions(session),
    );
  },
};

module.exports = Conversa;
