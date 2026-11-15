// seeds/05_mensagem.js
exports.seed = async function(knex) {
  await knex('mensagem').del();

  await knex('mensagem').insert([
    {
      id_con:         1,
      id_remetente:   3,
      conteudo_men:   'Olá, tudo bem?',
      enviada_em:     knex.fn.now(),
      visualizada_em: null
    },
    {
      id_con:         1,
      id_remetente:   1,
      conteudo_men:   'Tudo sim! Como posso te ajudar?',
      enviada_em:     knex.fn.now(),
      visualizada_em: null
    },
    {
      id_con:         2,
      id_remetente:   4,
      conteudo_men:   'Qual o melhor horário para você?',
      enviada_em:     knex.fn.now(),
      visualizada_em: null
    },
    {
      id_con:         2,
      id_remetente:   2,
      conteudo_men:   'As 15 horas da terça-feira.',
      enviada_em:     knex.fn.now(),
      visualizada_em: null
    },
    {
      id_con:         3,
      id_remetente:   3,
      conteudo_men:   'Onde é sua clínica?',
      enviada_em:     knex.fn.now(),
      visualizada_em: null
    },
  ]);
};