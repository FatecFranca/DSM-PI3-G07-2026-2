exports.up = function(knex) {
  return knex.schema.createTable('agendamento', function(table) {
    table.increments('id_agn');
    table.integer('id_usr').unsigned().notNullable();
    table.integer('id_dis').unsigned().notNullable();
    table.text('descricao_agn');
    table.enu('status_agn', ['pendente', 'confirmado', 'cancelado']).defaultTo('pendente');
    table.timestamp('criado_em').defaultTo(knex.fn.now());
    table.foreign('id_usr').references('id_usr').inTable('usuario').onDelete('CASCADE');
    table.foreign('id_dis').references('id_dis').inTable('disponibilidade').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('agendamento');
};