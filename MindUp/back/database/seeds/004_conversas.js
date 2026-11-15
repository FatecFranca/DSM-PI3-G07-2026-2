exports.seed = async function(knex) {
  await knex('conversas').del();

  await knex('conversas').insert([
    {
      id_usr:          3, 
      id_vol:          1, 
      criada_em:       knex.fn.now(),
      ultima_mensagem: 'Tudo sim! Como posso te ajudar?'
    },
    {
      id_usr:          4, 
      id_vol:          2, 
      criada_em:       knex.fn.now(),
      ultima_mensagem: 'Qual o melhor horário para você?'
    },
    {
      id_usr:          3,
      id_vol:          2,
      criada_em:       knex.fn.now(),
      ultima_mensagem: 'Onde é sua clínica?'
    },
  ]);
};