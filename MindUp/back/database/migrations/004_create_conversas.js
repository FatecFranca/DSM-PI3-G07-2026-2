exports.up = function(knex) {
  return knex.schema.createTable('conversas', function(table) {
    table.increments('id_con');
    table.integer('id_usr').unsigned().notNullable();
    table.integer('id_vol').unsigned().notNullable();
    table.timestamp('criada_em').defaultTo(knex.fn.now());
    table.text('ultima_mensagem');
    table.foreign('id_usr').references('id_usr').inTable('usuario').onDelete('CASCADE');
    table.foreign('id_vol').references('id_usr').inTable('usuario').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('conversas');
};