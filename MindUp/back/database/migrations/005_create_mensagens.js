
exports.up = function(knex) {
  return knex.schema.createTable('mensagem', function(table) {
    table.increments('id_men');
    table.integer('id_con').unsigned().notNullable();
    table.integer('id_remetente').unsigned().notNullable();
    table.text('conteudo_men').notNullable();
    table.timestamp('enviada_em').defaultTo(knex.fn.now());
    table.timestamp('visualizada_em').nullable();
    table.foreign('id_con').references('id_con').inTable('conversas').onDelete('CASCADE');
    table.foreign('id_remetente').references('id_usr').inTable('usuario').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('mensagem');
};