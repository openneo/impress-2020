const fs = require("fs");
const path = require("path");

const { ApolloServer } = require("apollo-server");
const { createTestClient } = require("apollo-server-testing");
const { AuthenticationClient } = require("auth0");

const connectToDb = require("../db");
const actualConnectToDb = jest.requireActual("../db");
const { config } = require("../index");

let accessTokenForQueries = null;

const { query } = createTestClient(
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
  const NOW = new Date("2020-01-01T00:00:00.000Z");
  jest.spyOn(global, "Date").mockImplementation(() => NOW);
});
beforeEach(() => {
  accessTokenForQueries = null;
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

async function logInAsTestUser() {
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
  getDbCalls,
  clearDbCalls,
  connectToDb,
  useTestDb,
  logInAsTestUser,
};
