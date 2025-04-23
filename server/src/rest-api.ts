import express from "express";
import cors from "cors";
import { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";
import { Secret, SecretFragment } from "./db/models";
import bcrypt from "bcrypt";
import {
  generateShareId,
  fragmentSecret,
  encryptFragment,
  decryptFragment,
  getSymmetricEncryptionKey,
} from "./util/secret-utils";

/** Make the Express app with the given database connection. */
const makeApp = (db: Knex) => {
  const app = express();

  //middleware
  app.use(cors());
  app.use(express.json());

  // Endpoint to create a new secret
  // @ts-expect-error Unclear why we're getting this error, not important for now
  app.post("/api/secrets", async (req, res) => {
    const { secret_text, expiration_days, password } = req.body as {
      secret_text?: string;
      expiration_days?: number;
      password?: string;
    };

    if (typeof secret_text !== "string") {
      return res.status(400).json({ error: "Secret text must be a string" });
    }

    let parsedExpirationDays: number | undefined = undefined;
    if (expiration_days !== undefined) {
      if (typeof expiration_days !== "number") {
        return res
          .status(400)
          .json({ error: "Expiration days must be a number" });
      } else if (expiration_days < 1) {
        return res
          .status(400)
          .json({ error: "Expiration days must be greater than 0" });
      } else {
        parsedExpirationDays = expiration_days;
      }
    }

    let parsedPassword: string | undefined = undefined;
    if (password !== undefined) {
      if (typeof password !== "string") {
        return res.status(400).json({ error: "Password must be a string" });
      } else {
        parsedPassword = password;
      }
    }

    // Attempt to generate a unique share_id up to 10 times. We could do something more deterministic, such as
    // using an incrementing number, but this is simpler and should be good enough for our purposes.
    let shareIdAttempts = 0;
    let share_id: string;
    while (true) {
      share_id = generateShareId();

      // ensure the share_id is unique
      if (await db("secrets").where({ share_id }).first()) {
        shareIdAttempts++;

        if (shareIdAttempts >= 10) {
          // This error path is untested on purpose, as it should be extremely unlikely to occur.
          return res
            .status(500)
            .json({ error: "Failed to generate unique share ID" });
        }
      } else {
        break;
      }
    }

    const expiresAt =
      parsedExpirationDays !== undefined
        ? new Date(Date.now() + parsedExpirationDays * 24 * 60 * 60 * 1000)
        : null;

    const fragments = fragmentSecret(secret_text);

    // Assuming we have access to a key
    const encryptionKey = getSymmetricEncryptionKey();

    try {
      // UUID v4 is good enough for the internal secret ID for our purposes
      const secretId = uuidv4();

      await db.transaction(async (trx) => {
        // Hash and salt the password if it exists
        const saltRounds = 10;
        const hashedPassword =
          parsedPassword !== undefined
            ? await bcrypt.hash(parsedPassword, saltRounds)
            : null;

        await trx("secrets").insert({
          id: secretId,
          password: hashedPassword,
          expires_at: expiresAt,
          share_id: share_id,
        });

        await Promise.all(
          fragments.map(async (fragment, index) => {
            const encryptedFragment = encryptFragment(fragment, encryptionKey);
            await trx("secret_fragments").insert({
              id: uuidv4(),
              secret_id: secretId,
              fragment_order: index,
              fragment_text: encryptedFragment,
            });
          })
        );
      });

      res.json({ share_id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create secret" });
    }
  });

  // Endpoint to retrieve a secret by share_id
  // @ts-expect-error Unclear why we're getting this error, not important for now
  app.get("/api/secrets/:share_id", async (req, res) => {
    const { share_id } = req.params;
    const { password } = req.query;

    if (!share_id || typeof share_id !== "string" || share_id.length !== 8) {
      return res.status(400).json({ error: "Invalid share ID" });
    }

    let parsedPassword: string | undefined = undefined;
    if (password !== undefined) {
      if (typeof password !== "string") {
        return res.status(400).json({ error: "Password must be a string" });
      } else {
        parsedPassword = password;
      }
    }

    // Assuming we have access to a key
    const encryptionKey = getSymmetricEncryptionKey();

    try {
      const secret = (await db("secrets")
        .where({ share_id })
        .first()) as Secret;

      if (!secret) {
        // Return a 404 Not Found status if the secret does not exist.
        return res.status(404).json({ error: "Secret not found" });
      }

      if (secret.expires_at && secret.expires_at < new Date()) {
        // Return a 410 Gone status if the secret has expired.
        // This is a more appropriate status code for expired resources.
        // TODO: should we delete the secret from the database?
        return res.status(410).json({ error: "Secret has expired" });
      }

      if (secret.password !== null && parsedPassword !== undefined) {
        // Use bcrypt to compare the provided password with the hashed password stored in the database.
        const passwordMatch = await bcrypt.compare(
          parsedPassword,
          secret.password
        );
        if (passwordMatch === false) {
          // Return a 401 Unauthorized status if the password is incorrect.
          return res.status(401).json({ error: "Incorrect password" });
        }
      }

      if (secret.password !== null && parsedPassword === undefined) {
        // Return a 401 Unauthorized status if the password is required but not provided.
        return res.status(401).json({ error: "Password required" });
      }

      const fragments = (await db("secret_fragments")
        .where({ secret_id: secret.id })
        .orderBy("fragment_order", "asc")) as SecretFragment[];

      const decryptedSecret = fragments
        .map((fragment) =>
          decryptFragment(fragment.fragment_text, encryptionKey)
        )
        .join("");

      res.json({ secret_text: decryptedSecret });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to retrieve secret" });
    }
  });

  const PORT = process.env.PORT || 8000;
  const server = app.listen(PORT, () => {
    console.log(`server has started on port ${PORT}`);
  });

  return { app, server };
};

export { makeApp };
