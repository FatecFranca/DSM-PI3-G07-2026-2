const disponibilidadeModels = require("../models/disponibilidade.model");

module.exports = {
  validadeConflito,
};

async function validadeConflito(
  id_vol,
  data,
  hora_ini,
  hora_fim,
  excludeId = null,
) {
  const conflitos = await disponibilidadeModels.findConflitos(
    id_vol,
    data,
    hora_ini,
    hora_fim,
    excludeId,
  );

  return conflitos.length > 0;
}
