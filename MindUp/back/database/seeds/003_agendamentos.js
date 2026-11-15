exports.seed = async function(knex) {
  await knex('agendamento').del();

  await knex('agendamento').insert([
    {
      id_usr:        3, 
      id_dis:        1, 
      descricao_agn: 'Consulta sobre ansiedade',
      status_agn:    'confirmado',
      criado_em:     knex.fn.now()
    },
    {
      id_usr:        4, 
      id_dis:        3,
      descricao_agn: 'Apoio para lidar com estresse',
      status_agn:    'pendente',
      criado_em:     knex.fn.now()
    },
    {
      id_usr:        3,
      id_dis:        2,
      descricao_agn: 'Retorno psicológico',
      status_agn:    'cancelado',
      criado_em:     knex.fn.now()
    },
  ]);
};