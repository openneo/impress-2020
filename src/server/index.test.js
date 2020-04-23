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
            "id": "38913",
            "name": "Zafara Agent Gloves",
            "thumbnailUrl": "http://images.neopets.com/items/clo_zafara_agent_gloves.gif",
          },
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
            "38913",
            "38911",
            "38912",
          ],
        ],
      ]
    `);
  });

  it("loads appearance data", async () => {
    const res = await query({
      query: gql`
        query {
          items(ids: ["38912", "38911", "37375"]) {
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
                  "id": "30203",
                  "imageUrl": "https://impress-asset-images.s3.amazonaws.com/object/000/000/006/6829/600x600.png?0",
                  "zone": Object {
                    "depth": 3,
                    "id": "3",
                    "label": "Background",
                  },
                },
              ],
            },
            "id": "37375",
            "name": "Moon and Stars Background",
          },
        ],
      }
    `);
    expect(queryFn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM items WHERE id IN (?,?,?)",
          Array [
            "38912",
            "38911",
            "37375",
          ],
        ],
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?,?,?) AND locale = \\"en\\"",
          Array [
            "38912",
            "38911",
            "37375",
          ],
        ],
        Array [
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?)",
          Array [
            "54",
            "75",
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
             WHERE (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0))",
          Array [
            "38912",
            "180",
            "38911",
            "180",
            "37375",
            "180",
          ],
        ],
        Array [
          "SELECT * FROM zones WHERE id IN (?,?,?)",
          Array [
            "26",
            "40",
            "3",
          ],
        ],
        Array [
          "SELECT * FROM zone_translations WHERE zone_id IN (?,?,?) AND locale = \\"en\\"",
          Array [
            "26",
            "40",
            "3",
          ],
        ],
      ]
    `);
  });
});

describe("PetAppearance", () => {
  it("loads for species and color", async () => {
    const res = await query({
      query: gql`
        query {
          petAppearance(speciesId: "54", colorId: "75") {
            layers {
              id
              imageUrl(size: SIZE_600)
              zone {
                depth
              }
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "petAppearance": Object {
          "layers": Array [
            Object {
              "id": "5995",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/007/7941/600x600.png?0",
              "zone": Object {
                "depth": 18,
              },
            },
            Object {
              "id": "5996",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/007/7942/600x600.png?0",
              "zone": Object {
                "depth": 7,
              },
            },
            Object {
              "id": "6000",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/007/7946/600x600.png?0",
              "zone": Object {
                "depth": 40,
              },
            },
            Object {
              "id": "16467",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/024/24008/600x600.png?0",
              "zone": Object {
                "depth": 34,
              },
            },
            Object {
              "id": "19549",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/028/28548/600x600.png?1345719457000",
              "zone": Object {
                "depth": 37,
              },
            },
            Object {
              "id": "19550",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/028/28549/600x600.png?0",
              "zone": Object {
                "depth": 38,
              },
            },
            Object {
              "id": "163528",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/028/28549/600x600.png?1326455337000",
              "zone": Object {
                "depth": 38,
              },
            },
          ],
        },
      }
    `);
    expect(queryFn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?)",
          Array [
            "54",
            "75",
          ],
        ],
        Array [
          "SELECT * FROM pet_states WHERE pet_type_id IN (?)",
          Array [
            "2",
          ],
        ],
        Array [
          "SELECT sa.*, rel.parent_id FROM swf_assets sa
             INNER JOIN parents_swf_assets rel ON
               rel.parent_type = \\"PetState\\" AND
               rel.swf_asset_id = sa.id
             WHERE rel.parent_id IN (?)",
          Array [
            "2",
          ],
        ],
        Array [
          "SELECT * FROM zones WHERE id IN (?,?,?,?,?,?)",
          Array [
            "15",
            "5",
            "37",
            "30",
            "33",
            "34",
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
