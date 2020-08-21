const { ApolloServer } = require("apollo-server");
const { createTestClient } = require("apollo-server-testing");

const connectToDb = require("../db");
const actualConnectToDb = jest.requireActual("../db");
const { config } = require("../index");

const { query } = createTestClient(new ApolloServer(config));

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
afterEach(() => {
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

module.exports = { query, getDbCalls };
