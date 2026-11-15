
exports.up = function(knex) {
  return knex.schema.createTable('usuario', function(table) {
    table.increments('id_usr');
    table.string('nome_usr', 100).notNullable();
    table.string('email_usr', 100).unique();
    table.string('senha_usr', 255).notNullable();
    table.string('faixa_etaria_usr', 20);
    table.enu('perfil_usr', ['voluntario', 'usuario', 'admin']);
    table.string('especialidade_vol', 100);
    table.string('contato_usr', 20);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('usuario');
};