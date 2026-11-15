exports.seed = async function(knex) {
  await knex('disponibilidade').del();

  await knex('disponibilidade').insert([
    {
      id_vol:       1,
      data_dis:     '2026-07-20',
      hora_ini_dis: '08:00:00',
      hora_fim_dis: '12:00:00',
      status_dis:   'disponivel'
    },
    {
      id_vol:       1,
      data_dis:     '2026-07-21',
      hora_ini_dis: '14:00:00',
      hora_fim_dis: '18:00:00',
      status_dis:   'ocupado'
    },
    {
      id_vol:       2,
      data_dis:     '2026-07-22',
      hora_ini_dis: '09:00:00',
      hora_fim_dis: '13:00:00',
      status_dis:   'disponivel'
    },
    {
      id_vol:       2,
      data_dis:     '2026-07-23',
      hora_ini_dis: '10:00:00',
      hora_fim_dis: '14:00:00',
      status_dis:   'cancelado'
    },
  ]);
};