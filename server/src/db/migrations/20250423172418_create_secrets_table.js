/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .createTable("secrets", (table) => {
      table.uuid("id").primary();
      table.text("password");
      table.timestamp("expires_at");
      table.string("share_id", 8).unique().notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .then(() => {
      return knex.schema.createTable("secret_fragments", (table) => {
        table.uuid("id").primary();
        table
          .uuid("secret_id")
          .references("id")
          .inTable("secrets")
          .onDelete("CASCADE");
        table.integer("fragment_order").notNullable();
        table.text("fragment_text").notNullable();
        table.timestamp("created_at").defaultTo(knex.fn.now());
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("secret_fragments")
    .then(() => knex.schema.dropTableIfExists("secrets"));
};
