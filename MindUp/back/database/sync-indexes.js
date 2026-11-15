require("dotenv").config();

const {
  connectDatabase,
  disconnectDatabase,
} = require("../src/config/database");

const Usuario = require("../src/models/usuario.model");
const Disponibilidade = require("../src/models/disponibilidade.model");
const Agendamento = require("../src/models/agendamento.model");
const Conversa = require("../src/models/conversa.model");
const Mensagem = require("../src/models/mensagem.model");

const models = [Usuario, Disponibilidade, Agendamento, Conversa, Mensagem];

async function syncIndexes() {
  await connectDatabase();

  for (const model of models) {
    await model.model.syncIndexes();
    console.log(`Índices sincronizados: ${model.model.modelName}`);
  }
}

syncIndexes()
  .catch((error) => {
    console.error("Erro ao sincronizar índices:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
