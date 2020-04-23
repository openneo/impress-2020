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
let db;
beforeAll(() => {
  connectToDb.mockImplementation(async (...args) => {
    db = await actualConnectToDb(...args);
    queryFn = jest.spyOn(db, "execute");
    return db;
  });
});
afterEach(() => {
  queryFn.mockClear();
});
afterAll(() => {
  db.end();
});

describe("Item", () => {
  it("loads metadata", async () => {
    const res = await query({
      query: gql`
        query {
          items(ids: ["38913", "38911", "38912"]) {
            id
            name
            thumbnailUrl
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "items": Array [
          Object {
            "id": "38911",
            "name": "Zafara Agent Hood",
            "thumbnailUrl": "http://images.neopets.com/items/clo_zafara_agent_hood.gif",
          },
          Object {
            "id": "38912",
            "name": "Zafara Agent Robe",
            "thumbnailUrl": "http://images.neopets.com/items/clo_zafara_agent_robe.gif",
          },
          Object {
            "id": "38913",
            "name": "Zafara Agent Gloves",
            "thumbnailUrl": "http://images.neopets.com/items/clo_zafara_agent_gloves.gif",
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
            "38911",
            "38912",
            "38913",
          ],
        ],
      ]
    `);
  });

  it("loads appearance data", async () => {
    const res = await query({
      query: gql`
        query {
          items(ids: ["38912", "38911"]) {
            id
            name

            appearanceOn(speciesId: "54", colorId: "75") {
              layers {
                id
                imageUrl(size: SIZE_600)
                zone {
                  id
                  depth
                  label
                }
              }
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "items": Array [
          Object {
            "appearanceOn": Object {
              "layers": Array [
                Object {
                  "id": "37129",
                  "imageUrl": "https://impress-asset-images.s3.amazonaws.com/object/000/000/014/14857/600x600.png?0",
                  "zone": Object {
                    "depth": 44,
                    "id": "40",
                    "label": "Hat",
                  },
                },
              ],
            },
            "id": "38911",
            "name": "Zafara Agent Hood",
          },
          Object {
            "appearanceOn": Object {
              "layers": Array [
                Object {
                  "id": "37128",
                  "imageUrl": "https://impress-asset-images.s3.amazonaws.com/object/000/000/014/14856/600x600.png?1587653266000",
                  "zone": Object {
                    "depth": 30,
                    "id": "26",
                    "label": "Jacket",
                  },
                },
              ],
            },
            "id": "38912",
            "name": "Zafara Agent Robe",
          },
        ],
      }
    `);
    expect(queryFn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM items WHERE id IN (?,?)",
          Array [
            "38912",
            "38911",
          ],
        ],
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?,?) AND locale = \\"en\\"",
          Array [
            "38911",
            "38912",
          ],
        ],
        Array [
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?)",
          Array [
            "54",
            "75",
            "54",
            "75",
          ],
        ],
        Array [
          "SELECT sa.*, rel.parent_id FROM swf_assets sa
             INNER JOIN parents_swf_assets rel ON
               rel.parent_type = \\"Item\\" AND
               rel.swf_asset_id = sa.id
             WHERE (rel.parent_id = ? AND sa.body_id = ?) OR (rel.parent_id = ? AND sa.body_id = ?)",
          Array [
            "38911",
            "180",
            "38912",
            "180",
          ],
        ],
        Array [
          "SELECT * FROM zones WHERE id IN (?,?)",
          Array [
            "40",
            "26",
          ],
        ],
        Array [
          "SELECT * FROM zone_translations WHERE zone_id IN (?,?) AND locale = \\"en\\"",
          Array [
            "40",
            "26",
          ],
        ],
      ]
    `);
  });
});

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
