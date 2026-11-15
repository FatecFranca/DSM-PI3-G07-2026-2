exports.up = function(knex) {
  return knex.schema.createTable('disponibilidade', function(table) {
    table.increments('id_dis');
    table.integer('id_vol').unsigned().notNullable();
    table.date('data_dis').notNullable();
    table.time('hora_ini_dis').notNullable();
    table.time('hora_fim_dis').notNullable();
    table.enu('status_dis', ['disponivel', 'pendente', 'ocupado', 'cancelado']).defaultTo('disponivel');
    table.foreign('id_vol').references('id_usr').inTable('usuario').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('disponibilidade');
};