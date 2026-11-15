require("dotenv").config();

const bcrypt = require("bcrypt");
const {
  connectDatabase,
  disconnectDatabase,
} = require("../src/config/database");

const Usuario = require("../src/models/usuario.model");
const Disponibilidade = require("../src/models/disponibilidade.model");
const Agendamento = require("../src/models/agendamento.model");
const Conversa = require("../src/models/conversa.model");
const Mensagem = require("../src/models/mensagem.model");

async function seed() {
  await connectDatabase();

  // Garante os índices (inclusive os unique) antes de inserir os dados.
  for (const model of [
    Usuario,
    Disponibilidade,
    Agendamento,
    Conversa,
    Mensagem,
  ]) {
    await model.model.syncIndexes();
  }

  await Mensagem.model.deleteMany({});
  await Conversa.model.deleteMany({});
  await Agendamento.model.deleteMany({});
  await Disponibilidade.model.deleteMany({});
  await Usuario.model.deleteMany({});

  const senha = await bcrypt.hash("123456", 10);

  const [carlos, ana, joao, maria, admin] = await Usuario.model.insertMany([
    {
      nome_usr: "Carlos Silva",
      senha_usr: senha,
      faixa_etaria_usr: "20-40",
      perfil_usr: "voluntario",
      especialidade_vol: "Psicologia",
      contato_usr: "11999990001",
      email_usr: "carlos@email.com",
    },
    {
      nome_usr: "Ana Souza",
      senha_usr: senha,
      faixa_etaria_usr: "20-40",
      perfil_usr: "voluntario",
      especialidade_vol: "Psiquiatria",
      contato_usr: "11999990002",
      email_usr: "ana@email.com",
    },
    {
      nome_usr: "João Lima",
      senha_usr: senha,
      faixa_etaria_usr: "10-20",
      perfil_usr: "usuario",
      especialidade_vol: null,
      contato_usr: "11999990003",
      email_usr: "joao@email.com",
    },
    {
      nome_usr: "Maria Oliveira",
      senha_usr: senha,
      faixa_etaria_usr: "40-60",
      perfil_usr: "usuario",
      especialidade_vol: null,
      contato_usr: "11999990004",
      email_usr: "maria@email.com",
    },
    {
      nome_usr: "Admin Geral",
      senha_usr: senha,
      faixa_etaria_usr: null,
      perfil_usr: "admin",
      especialidade_vol: null,
      contato_usr: "11999990005",
      email_usr: "admin@email.com",
    },
  ]);

  const [
    disponibilidadeCarlos1,
    disponibilidadeCarlos2,
    disponibilidadeAna1,
    disponibilidadeAna2,
  ] = await Disponibilidade.model.insertMany([
      {
        id_vol: carlos._id,
        data_dis: "2026-07-20",
        hora_ini_dis: "08:00",
        hora_fim_dis: "09:00",
        status_dis: "ocupado",
      },
      {
        id_vol: carlos._id,
        data_dis: "2026-07-21",
        hora_ini_dis: "14:00",
        hora_fim_dis: "15:00",
        status_dis: "cancelado",
      },
      {
        id_vol: ana._id,
        data_dis: "2026-07-22",
        hora_ini_dis: "09:00",
        hora_fim_dis: "10:00",
        status_dis: "pendente",
      },
      {
        id_vol: ana._id,
        data_dis: "2026-07-23",
        hora_ini_dis: "10:00",
        hora_fim_dis: "11:00",
        status_dis: "disponivel",
      },
    ]);

  await Agendamento.model.insertMany([
    {
      id_usr: joao._id,
      id_vol: carlos._id,
      id_dis: disponibilidadeCarlos1._id,
      descricao_agn: "Consulta sobre ansiedade",
      status_agn: "confirmado",
      criado_em: new Date("2026-07-15T10:00:00Z"),
    },
    {
      id_usr: maria._id,
      id_vol: ana._id,
      id_dis: disponibilidadeAna1._id,
      descricao_agn: "Apoio para lidar com estresse",
      status_agn: "pendente",
      criado_em: new Date("2026-07-16T10:00:00Z"),
    },
    {
      id_usr: joao._id,
      id_vol: carlos._id,
      id_dis: disponibilidadeCarlos2._id,
      descricao_agn: "Retorno psicológico",
      status_agn: "cancelado",
      criado_em: new Date("2026-07-14T10:00:00Z"),
    },
  ]);

  const [conversaJoaoCarlos, conversaMariaAna, conversaJoaoAna] =
    await Conversa.model.insertMany([
      {
        id_usr: joao._id,
        id_vol: carlos._id,
        criada_em: new Date("2026-07-15T09:00:00Z"),
        ultima_mensagem: "Tudo sim! Como posso te ajudar?",
      },
      {
        id_usr: maria._id,
        id_vol: ana._id,
        criada_em: new Date("2026-07-16T09:00:00Z"),
        ultima_mensagem: "Qual o melhor horário para você?",
      },
      {
        id_usr: joao._id,
        id_vol: ana._id,
        criada_em: new Date("2026-07-17T09:00:00Z"),
        ultima_mensagem: "Onde é sua clínica?",
      },
    ]);

  await Mensagem.model.insertMany([
    {
      id_con: conversaJoaoCarlos._id,
      id_remetente: joao._id,
      conteudo_men: "Olá, tudo bem?",
      enviada_em: new Date("2026-07-15T09:05:00Z"),
    },
    {
      id_con: conversaJoaoCarlos._id,
      id_remetente: carlos._id,
      conteudo_men: "Tudo sim! Como posso te ajudar?",
      enviada_em: new Date("2026-07-15T09:06:00Z"),
    },
    {
      id_con: conversaMariaAna._id,
      id_remetente: maria._id,
      conteudo_men: "Qual o melhor horário para você?",
      enviada_em: new Date("2026-07-16T09:05:00Z"),
    },
    {
      id_con: conversaMariaAna._id,
      id_remetente: ana._id,
      conteudo_men: "As 15 horas da terça-feira.",
      enviada_em: new Date("2026-07-16T09:07:00Z"),
    },
    {
      id_con: conversaJoaoAna._id,
      id_remetente: joao._id,
      conteudo_men: "Onde é sua clínica?",
      enviada_em: new Date("2026-07-17T09:05:00Z"),
    },
  ]);

  console.log("Seed concluído.");
  console.log(`Usuários: ${[carlos, ana, joao, maria, admin].length}`);
  console.log(`Disponibilidades: 4`);
  console.log(`Agendamentos: 3`);
  console.log(`Conversas: 3`);
  console.log(`Mensagens: 5`);
}

seed()
  .catch((error) => {
    console.error("Erro ao executar o seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
