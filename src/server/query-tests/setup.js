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
beforeAll(() => {
  connectToDb.mockImplementation(async (...args) => {
    db = await actualConnectToDb(...args);
    dbExecuteFn = jest.spyOn(db, "execute");
    return db;
  });
});
beforeEach(() => {
  accessTokenForQueries = null;
  if (dbExecuteFn) {
    dbExecuteFn.mockClear();
  }
});
afterAll(() => {
  if (db) {
    db.end();
  }
});
const getDbCalls = () => (dbExecuteFn ? dbExecuteFn.mock.calls : []);

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

module.exports = { query, getDbCalls, logInAsTestUser };
