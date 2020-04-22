const gql = require("graphql-tag");
const { ApolloServer } = require("apollo-server");
const { createTestClient } = require("apollo-server-testing");

const connectToDb = require("./db");
const actualConnectToDb = jest.requireActual("./db");
const { config } = require("./index");

const { query } = createTestClient(new ApolloServer(config));

// Spy on db.execute, so we can snapshot the queries we run. This can help us
// keep an eye on perf - watch for tests with way too many queries!
jest.mock("./db");
let queryFn;
beforeEach(() => {
  connectToDb.mockImplementation(async (...args) => {
    const db = await actualConnectToDb(...args);
    queryFn = jest.spyOn(db, "execute");
    return db;
  });
});
afterEach(() => {
  jest.resetAllMocks();
});

it("can load items", async () => {
  const res = await query({
    query: gql`
      query($ids: [ID!]!) {
        items(ids: $ids) {
          id
          name
        }
      }
    `,
    variables: {
      ids: [
        38913, // Zafara Agent Gloves
        38911, // Zafara Agent Hood
        38912, // Zafara Agent Robe
      ],
    },
  });

  expect(res.errors).toBeFalsy();
  expect(res.data).toMatchInlineSnapshot(`
    Object {
      "items": Array [
        Object {
          "id": "38911",
          "name": "Zafara Agent Hood",
        },
        Object {
          "id": "38912",
          "name": "Zafara Agent Robe",
        },
        Object {
          "id": "38913",
          "name": "Zafara Agent Gloves",
        },
      ],
    }
  `);
  expect(queryFn.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "SELECT * FROM items WHERE id IN (?,?,?)",
        Array [
          "38913",
          "38911",
          "38912",
        ],
      ],
      Array [
        "SELECT * FROM item_translations WHERE item_id IN (?,?,?) AND locale = \\"en\\"",
        Array [
          38911,
          38912,
          38913,
        ],
      ],
    ]
  `);
});
