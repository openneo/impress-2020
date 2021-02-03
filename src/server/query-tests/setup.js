import fs from "fs";
import path from "path";
import { ApolloServer } from "apollo-server";
import { createTestClient } from "apollo-server-testing";
import { AuthenticationClient } from "auth0";
import auth from "../auth";
const actualAuth = jest.requireActual("../auth");
import connectToDb from "../db";
const actualConnectToDb = jest.requireActual("../db");
import { config } from "../index";

let accessTokenForQueries = null;

const { query, mutate } = createTestClient(
  new ApolloServer({
    ...config,
    context: () =>
      config.context({
        req: {
          headers: {
            authorization: accessTokenForQueries
              ? `Bearer ${accessTokenForQueries}`
              : undefined,
          },
        },
      }),
  })
);

// Spy on db.execute, so we can snapshot the queries we run. This can help us
// keep an eye on perf - watch for tests with way too many queries!
jest.mock("../db");
let dbExecuteFn;
let db;
let dbEnvironment = "production";
let dbSetupDone = false;
const dbSetupScripts = [
  fs
    .readFileSync(
      path.join(__dirname, "../../../scripts/setup-mysql-dev-constants.sql")
    )
    .toString(),
  fs
    .readFileSync(
      path.join(__dirname, "../../../scripts/setup-mysql-dev-schema.sql")
    )
    .toString(),
];
beforeAll(() => {
  connectToDb.mockImplementation(async () => {
    let options;

    if (dbEnvironment === "test") {
      options = {
        host: "localhost",
        user: "impress_2020_test",
        password: "impress_2020_test",
        database: "impress_2020_test",
      };
    }

    db = await actualConnectToDb(options);

    if (dbEnvironment === "test" && !dbSetupDone) {
      for (const script of dbSetupScripts) {
        await db.query(script);
      }
    }
    dbSetupDone = true;

    dbExecuteFn = jest.spyOn(db, "execute");
    return db;
  });

  // Mock out a current "now" date, for consistent snapshots
  const ActualDate = Date;
  const NOW = new ActualDate("2020-01-01T00:00:00.000Z");
  jest.spyOn(global, "Date").mockImplementation(() => NOW);
  Date.now = () => NOW.getTime();
});
beforeEach(() => {
  // Restore auth values to default state.
  accessTokenForQueries = null;
  auth.getUserIdFromToken.mockImplementation(actualAuth.getUserIdFromToken);

  // Restore db values to default state.
  if (dbExecuteFn) {
    dbExecuteFn.mockClear();
  }
  dbEnvironment = "production";
  dbSetupDone = false;
  db = null;
});
afterAll(() => {
  if (db) {
    db.end();
  }
  Date.mockRestore();
});
const getDbCalls = () => (dbExecuteFn ? dbExecuteFn.mock.calls : []);
const clearDbCalls = () => dbExecuteFn?.mockClear();

function useTestDb() {
  if (db) {
    throw new Error(`can't call useTestDb() if db mock already exists`);
  }
  dbEnvironment = "test";
}

jest.mock("../auth");
async function logInAsTestUser() {
  if (dbEnvironment === "production") {
    const auth0 = new AuthenticationClient({
      domain: "openneo.us.auth0.com",
      clientId: process.env.AUTH0_TEST_CLIENT_ID,
      clientSecret: process.env.AUTH0_TEST_CLIENT_SECRET,
    });

    const res = await auth0.passwordGrant({
      username: "dti-test",
      password: process.env.DTI_TEST_USER_PASSWORD,
      audience: "https://impress-2020.openneo.net/api",
    });

    accessTokenForQueries = res.access_token;
  } else if (dbEnvironment === "test") {
    // Create a test user record. Most of these values don't matter.
    const db = await connectToDb();
    await db.query(
      `INSERT INTO users (id, name, auth_server_id, remote_id)
       VALUES (1, "test-user-1", 1, 1)`
    );

    // Mock the server's auth code to return user ID 1.
    auth.getUserIdFromToken.mockImplementation(async () => "1");
    accessTokenForQueries = "mock-access-token-test-user-1";
  } else {
    throw new Error(`unexpected dbEnvironment ${dbEnvironment}`);
  }
}

async function createItem(id) {
  if (dbEnvironment !== "test") {
    throw new Error(`Please only use createItem in test db!`);
  }

  const name = `Test Item ${id}`;

  const db = await connectToDb();
  await Promise.all([
    db.query(
      `INSERT INTO items (id, zones_restrict, thumbnail_url, category,
                          type, rarity_index, price, weight_lbs)
         VALUES (?, "00000000000000000000000000000000000000000000000",
                 "http://example.com/favicon.ico", "Clothes", "Clothes", 101,
                 0, 1);
      `,
      [id]
    ),
    db.query(
      `INSERT INTO item_translations (item_id, locale, name, description,
                                      rarity)
         VALUES (?, "en", ?, "This is a test item.", "Special")
      `,
      [id, name]
    ),
  ]);
}

// Add a new `expect(res).toHaveNoErrors()` to call after GraphQL calls!
expect.extend({
  toHaveNoErrors(res) {
    if (res.errors) {
      return {
        message: () =>
          `expected no GraphQL errors, but got:\n    ${res.errors}`,
        pass: false,
      };
    } else {
      return {
        message: () => `expected GraphQL errors, but there were none`,
        pass: true,
      };
    }
  },
});

// Use the new modeling code, even though it's disabled in most environments,
// in order to test it.
process.env["USE_NEW_MODELING"] = "1";

module.exports = {
  query,
  mutate,
  getDbCalls,
  clearDbCalls,
  connectToDb,
  useTestDb,
  logInAsTestUser,
  createItem,
};
