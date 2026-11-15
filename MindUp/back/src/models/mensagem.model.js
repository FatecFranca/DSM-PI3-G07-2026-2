const mongoose = require("mongoose");
const {
  legacyIdTransform,
  sessionOptions,
  toObjectId,
} = require("../utils/mongoose");

const mensagemSchema = new mongoose.Schema(
  {
    id_con: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversa",
      required: true,
      index: true,
    },
    id_remetente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    conteudo_men: { type: String, required: true },
    enviada_em: { type: Date, default: Date.now },
    visualizada_em: { type: Date, default: null },
  },
  {
    collection: "mensagem",
    toJSON: {
      virtuals: true,
      transform: legacyIdTransform("id_men"),
    },
    toObject: {
      virtuals: true,
      transform: legacyIdTransform("id_men"),
    },
  },
);

mensagemSchema.index({ id_con: 1, enviada_em: 1 });

const MensagemModel = mongoose.model("Mensagem", mensagemSchema);

const Mensagem = {
  model: MensagemModel,

  async create(data) {
    const mensagem = await MensagemModel.create(data);
    return mensagem._id;
  },

  async findByConversaId(id_con) {
    const idCon = toObjectId(id_con);
    if (!idCon) return [];

    return MensagemModel.aggregate([
      { $match: { id_con: idCon } },
      {
        $lookup: {
          from: "usuario",
          localField: "id_remetente",
          foreignField: "_id",
          as: "remetente",
        },
      },
      {
        $unwind: {
          path: "$remetente",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          id_men: { $toString: "$_id" },
          id_con: 1,
          id_remetente: 1,
          conteudo_men: 1,
          enviada_em: 1,
          visualizada_em: 1,
          nome_usr: "$remetente.nome_usr",
        },
      },
      { $sort: { enviada_em: 1 } },
    ]);
  },

  findById(id) {
    return MensagemModel.findById(id);
  },

  async marcarComoVisualizada(id_men) {
    const result = await MensagemModel.updateOne(
      { _id: id_men },
      { $set: { visualizada_em: new Date() } },
    );

    return result.matchedCount;
  },

  deleteByConversationIds(ids, session) {
    return MensagemModel.deleteMany(
      { id_con: { $in: ids } },
      sessionOptions(session),
    );
  },
};

module.exports = Mensagem;
