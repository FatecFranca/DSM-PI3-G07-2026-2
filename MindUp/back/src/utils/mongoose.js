const mongoose = require("mongoose");

function toStringId(value) {
  if (value == null) return value;
  if (typeof value === "object" && value._id != null) {
    return value._id.toString();
  }
  return value.toString();
}

function sameId(left, right) {
  if (left == null || right == null) return false;
  return toStringId(left) === toStringId(right);
}

function isValidObjectId(value) {
  if (value == null) return false;
  return mongoose.Types.ObjectId.isValid(String(value));
}

function toObjectId(value) {
  if (!isValidObjectId(value)) return null;
  return new mongoose.Types.ObjectId(String(value));
}

function sessionOptions(session) {
  return session ? { session } : {};
}

function useSession(query, session) {
  return session ? query.session(session) : query;
}

/**
 * Mantém o contrato antigo da API: além de _id, cada documento expõe
 * o identificador que o frontend já usava (id_usr, id_dis, etc.).
 */
function legacyIdTransform(idField) {
  return (_doc, ret) => {
    if (ret._id) {
      ret[idField] = ret._id.toString();
    }
    delete ret.__v;
    return ret;
  };
}

module.exports = {
  toStringId,
  sameId,
  isValidObjectId,
  toObjectId,
  sessionOptions,
  useSession,
  legacyIdTransform,
};
