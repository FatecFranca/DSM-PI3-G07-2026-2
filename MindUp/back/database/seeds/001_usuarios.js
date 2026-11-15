const bcrypt = require("bcrypt");

exports.seed = async function (knex) {
  await knex("usuario").del();

  const senha = await bcrypt.hash("123456", 10);

  await knex("usuario").insert([
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
      especialidade_vol: "Psquiatria",
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
};
