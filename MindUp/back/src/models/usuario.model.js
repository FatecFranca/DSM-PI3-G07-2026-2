const mongoose = require("mongoose");
const passwordService = require("../services/password.services");
const { legacyIdTransform, sessionOptions } = require("../utils/mongoose");
const { withTransaction } = require("../services/transaction.services");

const usuarioSchema = new mongoose.Schema(
  {
    nome_usr: { type: String, required: true, trim: true, maxlength: 100 },
    email_usr: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
    },
    senha_usr: { type: String, required: true, select: false },
    faixa_etaria_usr: { type: String, maxlength: 20 },
    perfil_usr: {
      type: String,
      enum: ["voluntario", "usuario", "admin"],
    },
    especialidade_vol: { type: String, maxlength: 100 },
    contato_usr: { type: String, maxlength: 20 },
    cidade_usr: { type: String, maxlength: 80, trim: true },
    estado_usr: {
      type: String,
      maxlength: 2,
      uppercase: true,
      trim: true,
    },
  },
  {
    collection: "usuario",
    toJSON: {
      virtuals: true,
      transform: legacyIdTransform("id_usr"),
    },
    toObject: {
      virtuals: true,
      transform: legacyIdTransform("id_usr"),
    },
  },
);

const UsuarioModel = mongoose.model("Usuario", usuarioSchema);

function cleanPayload(data) {
  const { _id, __v, id_usr, ...payload } = data;
  return payload;
}

const Usuario = {
  model: UsuarioModel,

  findAll() {
    return UsuarioModel.find({});
  },

  findById(id) {
    return UsuarioModel.findById(id);
  },

  findByEmail(email) {
    return UsuarioModel.findOne({
      email_usr: String(email).trim().toLowerCase(),
    }).select("+senha_usr");
  },

  async create(data) {
    const payload = cleanPayload(data);

    if (payload.senha_usr) {
      payload.senha_usr = await passwordService.encryptPassword(
        payload.senha_usr,
      );
    }

    const usuario = await UsuarioModel.create(payload);
    return usuario._id;
  },

  async update(id, data) {
    const payload = cleanPayload(data);

    if (payload.senha_usr) {
      payload.senha_usr = await passwordService.encryptPassword(
        payload.senha_usr,
      );
    }

    const result = await UsuarioModel.updateOne({ _id: id }, payload, {
      runValidators: true,
    });

    return result.matchedCount;
  },

  delete(id) {
    // O MySQL removia os registros dependentes via ON DELETE CASCADE.
    // No MongoDB essa limpeza é feita explicitamente e, quando possível,
    // dentro da mesma transação.
    const Conversa = require("./conversa.model");
    const Mensagem = require("./mensagem.model");
    const Agendamento = require("./agendamento.model");
    const Disponibilidade = require("./disponibilidade.model");

    return withTransaction(async (session) => {
      const conversas = await Conversa.findByParticipantId(id, session);
      const conversaIds = conversas.map((conversa) => conversa._id);

      await Mensagem.deleteByConversationIds(conversaIds, session);
      await Conversa.deleteByParticipantId(id, session);
      await Agendamento.deleteByUserId(id, session);
      await Disponibilidade.deleteByVolunteerId(id, session);

      const result = await UsuarioModel.deleteOne(
        { _id: id },
        sessionOptions(session),
      );

      return result.deletedCount;
    });
  },
};

module.exports = Usuario;
