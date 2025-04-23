import request from "supertest";
import dotenv from "dotenv";
// load the environment variables from the .env.test file
dotenv.config({ path: "../.env.test" });
import { makeApp } from "../src/rest-api";
import { Knex, knex } from "knex";
import path from "path";

// only 'infisical' is guaranteed to exist in the test db
const DEFAULT_DB_NAME = "infisical";

// Create a new instance of the test db client.
const makeDb = (dbName: string) => {
  const DB_CONNECTION_URI = `postgres://infisical:infisical@localhost/${dbName}?sslmode=disable`;

  return knex({
    client: "pg",
    migrations: {
      directory: path.join(__dirname, "../src/db/migrations"),
    },
    connection: {
      connectionString: DB_CONNECTION_URI,
      ssl: {
        rejectUnauthorized: false,
      },
    },
  });
};

describe("Secrets API", () => {
  let app: ReturnType<typeof makeApp>["app"];
  let server: ReturnType<typeof makeApp>["server"];
  let nonTestDb: Knex;
  let db: Knex;

  const testDbName = process.env.DB_NAME || "infisical_test";

  beforeAll(async () => {
    nonTestDb = makeDb(DEFAULT_DB_NAME);

    // ensure that the test db exists before running migrations
    // extract the db name from the connection string
    await nonTestDb.raw(`CREATE DATABASE ${testDbName}`).catch(() => {
      // ignore the error if the db already exists
      console.log(`Database ${testDbName} already exists`);
    });

    db = makeDb(testDbName);
    await db.migrate.latest();
    ({ app, server } = makeApp(db));
  });

  afterEach(async () => {
    // clear the secrets table after each test
    await db.delete().from("secrets");
    await db.delete().from("secret_fragments");
  });

  afterAll(async () => {
    await server.close();
    console.log("Server closed");

    // close the db connection to the test db
    await db.destroy();
    // drop the test db
    await nonTestDb.raw(`DROP DATABASE ${testDbName};`);
  });

  it("should fail to create a new secret with bad inputs", async () => {
    const badInputs = [
      // no secret_text
      {},
      // non-string secret_text
      { secret_text: 123 },
      // non-number expiration_days
      { secret_text: "test secret", expiration_days: "test" },
      // expiration_days < 1
      { secret_text: "test secret", expiration_days: 0 },
      // non-string password
      { secret_text: "test secret", password: 123 },
    ];

    for (const input of badInputs) {
      const response = await request(app).post("/api/secrets").send(input);

      expect(response.status).toBe(400);
    }
  });

  it("should create a new secret with no password and expiration and retrieve it successfully", async () => {
    const response = await request(app)
      .post("/api/secrets")
      .send({ secret_text: "test secret" });

    expect(response.status).toBe(200);
    expect(response.body.share_id).toBeDefined();

    const getResponse = await request(app).get(
      `/api/secrets/${response.body.share_id}`
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.secret_text).toBe("test secret");

    // unnecessary password should be ignored
    const getWithPasswordResponse = await request(app)
      .get(`/api/secrets/${response.body.share_id}`)
      .send({ password: "testpassword" });

    expect(getWithPasswordResponse.status).toBe(200);
    expect(getWithPasswordResponse.body.secret_text).toBe("test secret");
  });

  it("should create a new secret with a password and retrieve it successfully", async () => {
    const response = await request(app).post("/api/secrets").send({
      secret_text: "test secret",
      password: "testpassword",
    });

    expect(response.status).toBe(200);
    expect(response.body.share_id).toBeDefined();

    const getResponse = await request(app).get(
      `/api/secrets/${response.body.share_id}`
    );

    expect(getResponse.status).toBe(401);

    const getWithBadPasswordResponse = await request(app)
      .get(`/api/secrets/${response.body.share_id}`)
      .send({ password: "wrongpassword" });

    expect(getWithBadPasswordResponse.status).toBe(401);

    const getWithPasswordResponse = await request(app)
      .get(`/api/secrets/${response.body.share_id}`)
      .send({ password: "testpassword" });

    expect(getWithPasswordResponse.status).toBe(200);
    expect(getWithPasswordResponse.body.secret_text).toBe("test secret");
  });

  it("should handle a large secret by fragmenting it", async () => {
    const largeSecret = "a".repeat(100000);
    const response = await request(app).post("/api/secrets").send({
      secret_text: largeSecret,
    });

    expect(response.status).toBe(200);
    expect(response.body.share_id).toBeDefined();

    const getResponse = await request(app).get(
      `/api/secrets/${response.body.share_id}`
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.secret_text).toBe(largeSecret);

    const secret = await db("secrets").where({
      share_id: response.body.share_id,
    });

    expect(secret.length).toBe(1);

    const fragments = await db("secret_fragments")
      .where({ secret_id: secret[0].id })
      .orderBy("fragment_order");

    expect(fragments.length).toBeGreaterThan(1);
  });

  it("should reject a get secret request with an invalid share_id", async () => {
    const response = await request(app).get("/api/secrets/invalidshareid");

    expect(response.status).toBe(400);
  });

  it("should reject a get secret request with a non-existent share_id", async () => {
    const response = await request(app).get("/api/secrets/abcdefgh");

    expect(response.status).toBe(404);
  });

  it("should reject a get secret request with an expired secret", async () => {
    const response = await request(app).post("/api/secrets").send({
      secret_text: "test secret",
      expiration_days: 1,
    });

    // modify the expiration date to be in the past
    await db("secrets")
      .where({ share_id: response.body.share_id })
      // warning: this is a hacky way to set the expiration date, but it works
      .update({ expiration_date: new Date(Date.now() - 1_000_000) });

    const getResponse = await request(app).get(
      `/api/secrets/${response.body.share_id}`
    );

    expect(getResponse.status).toBe(410);
  });
});
