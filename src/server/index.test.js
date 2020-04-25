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

              restrictedZones {
                id
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
                  "imageUrl": "https://impress-asset-images.s3.amazonaws.com/object/000/000/014/14856/600x600.png?v2-1587653266000",
                  "zone": Object {
                    "depth": 30,
                    "id": "26",
                    "label": "Jacket",
                  },
                },
              ],
              "restrictedZones": Array [
                Object {
                  "id": "20",
                },
                Object {
                  "id": "22",
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
                  "imageUrl": "https://impress-asset-images.s3.amazonaws.com/object/000/000/014/14857/600x600.png?v2-0",
                  "zone": Object {
                    "depth": 44,
                    "id": "40",
                    "label": "Hat",
                  },
                },
              ],
              "restrictedZones": Array [
                Object {
                  "id": "37",
                },
                Object {
                  "id": "38",
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
                  "imageUrl": "https://impress-asset-images.s3.amazonaws.com/object/000/000/006/6829/600x600.png?v2-0",
                  "zone": Object {
                    "depth": 3,
                    "id": "3",
                    "label": "Background",
                  },
                },
              ],
              "restrictedZones": Array [],
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
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/007/7941/600x600.png?v2-0",
              "zone": Object {
                "depth": 18,
              },
            },
            Object {
              "id": "5996",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/007/7942/600x600.png?v2-0",
              "zone": Object {
                "depth": 7,
              },
            },
            Object {
              "id": "6000",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/007/7946/600x600.png?v2-0",
              "zone": Object {
                "depth": 40,
              },
            },
            Object {
              "id": "16467",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/024/24008/600x600.png?v2-0",
              "zone": Object {
                "depth": 34,
              },
            },
            Object {
              "id": "19549",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/028/28548/600x600.png?v2-1345719457000",
              "zone": Object {
                "depth": 37,
              },
            },
            Object {
              "id": "19550",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/028/28549/600x600.png?v2-0",
              "zone": Object {
                "depth": 38,
              },
            },
            Object {
              "id": "163528",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/028/28549/600x600.png?v2-1326455337000",
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

describe("Search", () => {
  it("loads Neopian Times items", async () => {
    const res = await query({
      query: gql`
        query {
          itemSearch(query: "Neopian Times") {
            query
            items {
              id
              name
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "itemSearch": Object {
          "items": Array [
            Object {
              "id": "40431",
              "name": "Neopian Times Background",
            },
            Object {
              "id": "59391",
              "name": "Neopian Times Eyrie Hat",
            },
            Object {
              "id": "59392",
              "name": "Neopian Times Eyrie Shirt and Vest",
            },
            Object {
              "id": "59394",
              "name": "Neopian Times Eyrie Shoes",
            },
            Object {
              "id": "59393",
              "name": "Neopian Times Eyrie Trousers",
            },
            Object {
              "id": "59390",
              "name": "Neopian Times Eyries Paper",
            },
            Object {
              "id": "51098",
              "name": "Neopian Times Writing Quill",
            },
            Object {
              "id": "61101",
              "name": "Neopian Times Zafara Handkerchief",
            },
            Object {
              "id": "61100",
              "name": "Neopian Times Zafara Hat",
            },
            Object {
              "id": "61102",
              "name": "Neopian Times Zafara Shirt and Vest",
            },
            Object {
              "id": "61104",
              "name": "Neopian Times Zafara Shoes",
            },
            Object {
              "id": "61103",
              "name": "Neopian Times Zafara Trousers",
            },
          ],
          "query": "Neopian Times",
        },
      }
    `);
    expect(queryFn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT items.*, t.name FROM items
               INNER JOIN item_translations t ON t.item_id = items.id
               WHERE t.name LIKE ? AND t.locale=\\"en\\"
               ORDER BY t.name
               LIMIT 30",
          Array [
            "%Neopian Times%",
          ],
        ],
      ]
    `);
  });

  it("loads Neopian Times items that fit the Starry Zafara", async () => {
    const res = await query({
      query: gql`
        query {
          itemSearchToFit(
            query: "Neopian Times"
            speciesId: "54"
            colorId: "75"
          ) {
            query
            items {
              id
              name
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "itemSearchToFit": Object {
          "items": Array [
            Object {
              "id": "40431",
              "name": "Neopian Times Background",
            },
            Object {
              "id": "51098",
              "name": "Neopian Times Writing Quill",
            },
            Object {
              "id": "61101",
              "name": "Neopian Times Zafara Handkerchief",
            },
            Object {
              "id": "61100",
              "name": "Neopian Times Zafara Hat",
            },
            Object {
              "id": "61102",
              "name": "Neopian Times Zafara Shirt and Vest",
            },
            Object {
              "id": "61104",
              "name": "Neopian Times Zafara Shoes",
            },
            Object {
              "id": "61103",
              "name": "Neopian Times Zafara Trousers",
            },
          ],
          "query": "Neopian Times",
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
          "SELECT items.*, t.name FROM items
                 INNER JOIN item_translations t ON t.item_id = items.id
                 INNER JOIN parents_swf_assets rel
                     ON rel.parent_type = \\"Item\\" AND rel.parent_id = items.id
                 INNER JOIN swf_assets ON rel.swf_asset_id = swf_assets.id
                 WHERE t.name LIKE ? AND t.locale=\\"en\\" AND
                     (swf_assets.body_id = ? OR swf_assets.body_id = 0)
                 ORDER BY t.name
                 LIMIT ? OFFSET ?",
          Array [
            "%Neopian Times%",
            "180",
            30,
            0,
          ],
        ],
      ]
    `);
  });

  it("loads the first 10 hats that fit the Starry Zafara", async () => {
    const res = await query({
      query: gql`
        query {
          itemSearchToFit(
            query: "hat"
            speciesId: "54"
            colorId: "75"
            offset: 0
            limit: 10
          ) {
            query
            items {
              id
              name
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "itemSearchToFit": Object {
          "items": Array [
            Object {
              "id": "74967",
              "name": "17th Birthday Party Hat",
            },
            Object {
              "id": "49026",
              "name": "Abominable Snowman Hat",
            },
            Object {
              "id": "67242",
              "name": "Accessories Shop Wig and Hat",
            },
            Object {
              "id": "67242",
              "name": "Accessories Shop Wig and Hat",
            },
            Object {
              "id": "64177",
              "name": "Acorn Hat",
            },
            Object {
              "id": "69995",
              "name": "Adventure in Pastel Hat and Wig",
            },
            Object {
              "id": "69995",
              "name": "Adventure in Pastel Hat and Wig",
            },
            Object {
              "id": "62375",
              "name": "Altador Cup Trophy Hat",
            },
            Object {
              "id": "56654",
              "name": "Altador Team Hat",
            },
            Object {
              "id": "62322",
              "name": "Altador Team Jester Hat",
            },
          ],
          "query": "hat",
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
          "SELECT items.*, t.name FROM items
                 INNER JOIN item_translations t ON t.item_id = items.id
                 INNER JOIN parents_swf_assets rel
                     ON rel.parent_type = \\"Item\\" AND rel.parent_id = items.id
                 INNER JOIN swf_assets ON rel.swf_asset_id = swf_assets.id
                 WHERE t.name LIKE ? AND t.locale=\\"en\\" AND
                     (swf_assets.body_id = ? OR swf_assets.body_id = 0)
                 ORDER BY t.name
                 LIMIT ? OFFSET ?",
          Array [
            "%hat%",
            "180",
            10,
            0,
          ],
        ],
      ]
    `);
  });

  it("loads the next 10 hats that fit the Starry Zafara", async () => {
    const res = await query({
      query: gql`
        query {
          itemSearchToFit(
            query: "hat"
            speciesId: "54"
            colorId: "75"
            offset: 10
            limit: 10
          ) {
            query
            items {
              id
              name
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "itemSearchToFit": Object {
          "items": Array [
            Object {
              "id": "58733",
              "name": "Apple Bobbing Bart Hat",
            },
            Object {
              "id": "80401",
              "name": "Aurricks Finest Hat",
            },
            Object {
              "id": "80401",
              "name": "Aurricks Finest Hat",
            },
            Object {
              "id": "50168",
              "name": "Babaa Hat",
            },
            Object {
              "id": "78311",
              "name": "Backwards Hat and Wig",
            },
            Object {
              "id": "78311",
              "name": "Backwards Hat and Wig",
            },
            Object {
              "id": "66653",
              "name": "Bagel Hat Wig",
            },
            Object {
              "id": "66653",
              "name": "Bagel Hat Wig",
            },
            Object {
              "id": "51366",
              "name": "Balloon Sculpture Hat",
            },
            Object {
              "id": "51366",
              "name": "Balloon Sculpture Hat",
            },
          ],
          "query": "hat",
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
          "SELECT items.*, t.name FROM items
                 INNER JOIN item_translations t ON t.item_id = items.id
                 INNER JOIN parents_swf_assets rel
                     ON rel.parent_type = \\"Item\\" AND rel.parent_id = items.id
                 INNER JOIN swf_assets ON rel.swf_asset_id = swf_assets.id
                 WHERE t.name LIKE ? AND t.locale=\\"en\\" AND
                     (swf_assets.body_id = ? OR swf_assets.body_id = 0)
                 ORDER BY t.name
                 LIMIT ? OFFSET ?",
          Array [
            "%hat%",
            "180",
            10,
            10,
          ],
        ],
      ]
    `);
  });
});

describe("Species", () => {
  it("loads all species", async () => {
    const res = await query({
      query: gql`
        query {
          allSpecies {
            id
            name
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "allSpecies": Array [
          Object {
            "id": "1",
            "name": "acara",
          },
          Object {
            "id": "2",
            "name": "aisha",
          },
          Object {
            "id": "3",
            "name": "blumaroo",
          },
          Object {
            "id": "4",
            "name": "bori",
          },
          Object {
            "id": "5",
            "name": "bruce",
          },
          Object {
            "id": "6",
            "name": "buzz",
          },
          Object {
            "id": "7",
            "name": "chia",
          },
          Object {
            "id": "8",
            "name": "chomby",
          },
          Object {
            "id": "9",
            "name": "cybunny",
          },
          Object {
            "id": "10",
            "name": "draik",
          },
          Object {
            "id": "11",
            "name": "elephante",
          },
          Object {
            "id": "12",
            "name": "eyrie",
          },
          Object {
            "id": "13",
            "name": "flotsam",
          },
          Object {
            "id": "14",
            "name": "gelert",
          },
          Object {
            "id": "15",
            "name": "gnorbu",
          },
          Object {
            "id": "16",
            "name": "grarrl",
          },
          Object {
            "id": "17",
            "name": "grundo",
          },
          Object {
            "id": "18",
            "name": "hissi",
          },
          Object {
            "id": "19",
            "name": "ixi",
          },
          Object {
            "id": "20",
            "name": "jetsam",
          },
          Object {
            "id": "21",
            "name": "jubjub",
          },
          Object {
            "id": "22",
            "name": "kacheek",
          },
          Object {
            "id": "23",
            "name": "kau",
          },
          Object {
            "id": "24",
            "name": "kiko",
          },
          Object {
            "id": "25",
            "name": "koi",
          },
          Object {
            "id": "26",
            "name": "korbat",
          },
          Object {
            "id": "27",
            "name": "kougra",
          },
          Object {
            "id": "28",
            "name": "krawk",
          },
          Object {
            "id": "29",
            "name": "kyrii",
          },
          Object {
            "id": "30",
            "name": "lenny",
          },
          Object {
            "id": "31",
            "name": "lupe",
          },
          Object {
            "id": "32",
            "name": "lutari",
          },
          Object {
            "id": "33",
            "name": "meerca",
          },
          Object {
            "id": "34",
            "name": "moehog",
          },
          Object {
            "id": "35",
            "name": "mynci",
          },
          Object {
            "id": "36",
            "name": "nimmo",
          },
          Object {
            "id": "37",
            "name": "ogrin",
          },
          Object {
            "id": "38",
            "name": "peophin",
          },
          Object {
            "id": "39",
            "name": "poogle",
          },
          Object {
            "id": "40",
            "name": "pteri",
          },
          Object {
            "id": "41",
            "name": "quiggle",
          },
          Object {
            "id": "42",
            "name": "ruki",
          },
          Object {
            "id": "43",
            "name": "scorchio",
          },
          Object {
            "id": "44",
            "name": "shoyru",
          },
          Object {
            "id": "45",
            "name": "skeith",
          },
          Object {
            "id": "46",
            "name": "techo",
          },
          Object {
            "id": "47",
            "name": "tonu",
          },
          Object {
            "id": "48",
            "name": "tuskaninny",
          },
          Object {
            "id": "49",
            "name": "uni",
          },
          Object {
            "id": "50",
            "name": "usul",
          },
          Object {
            "id": "51",
            "name": "wocky",
          },
          Object {
            "id": "52",
            "name": "xweetok",
          },
          Object {
            "id": "53",
            "name": "yurble",
          },
          Object {
            "id": "54",
            "name": "zafara",
          },
          Object {
            "id": "55",
            "name": "vandagyre",
          },
        ],
      }
    `);
    expect(queryFn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM species",
        ],
        Array [
          "SELECT * FROM species_translations
             WHERE species_id IN (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
            "27",
            "28",
            "29",
            "30",
            "31",
            "32",
            "33",
            "34",
            "35",
            "36",
            "37",
            "38",
            "39",
            "40",
            "41",
            "42",
            "43",
            "44",
            "45",
            "46",
            "47",
            "48",
            "49",
            "50",
            "51",
            "52",
            "53",
            "54",
            "55",
          ],
        ],
      ]
    `);
  });
});

describe("Color", () => {
  it("loads all colors", async () => {
    const res = await query({
      query: gql`
        query {
          allColors {
            id
            name
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "allColors": Array [
          Object {
            "id": "-1",
            "name": "nebula",
          },
          Object {
            "id": "1",
            "name": "alien",
          },
          Object {
            "id": "2",
            "name": "apple",
          },
          Object {
            "id": "3",
            "name": "asparagus",
          },
          Object {
            "id": "4",
            "name": "aubergine",
          },
          Object {
            "id": "5",
            "name": "avocado",
          },
          Object {
            "id": "6",
            "name": "baby",
          },
          Object {
            "id": "7",
            "name": "biscuit",
          },
          Object {
            "id": "8",
            "name": "blue",
          },
          Object {
            "id": "9",
            "name": "blueberry",
          },
          Object {
            "id": "10",
            "name": "brown",
          },
          Object {
            "id": "11",
            "name": "camouflage",
          },
          Object {
            "id": "12",
            "name": "carrot",
          },
          Object {
            "id": "13",
            "name": "checkered",
          },
          Object {
            "id": "14",
            "name": "chocolate",
          },
          Object {
            "id": "15",
            "name": "chokato",
          },
          Object {
            "id": "16",
            "name": "christmas",
          },
          Object {
            "id": "17",
            "name": "clay",
          },
          Object {
            "id": "18",
            "name": "cloud",
          },
          Object {
            "id": "19",
            "name": "coconut",
          },
          Object {
            "id": "20",
            "name": "custard",
          },
          Object {
            "id": "21",
            "name": "darigan",
          },
          Object {
            "id": "22",
            "name": "desert",
          },
          Object {
            "id": "23",
            "name": "disco",
          },
          Object {
            "id": "24",
            "name": "durian",
          },
          Object {
            "id": "25",
            "name": "electric",
          },
          Object {
            "id": "26",
            "name": "faerie",
          },
          Object {
            "id": "27",
            "name": "fire",
          },
          Object {
            "id": "28",
            "name": "garlic",
          },
          Object {
            "id": "29",
            "name": "ghost",
          },
          Object {
            "id": "30",
            "name": "glowing",
          },
          Object {
            "id": "31",
            "name": "gold",
          },
          Object {
            "id": "32",
            "name": "gooseberry",
          },
          Object {
            "id": "33",
            "name": "grape",
          },
          Object {
            "id": "34",
            "name": "green",
          },
          Object {
            "id": "35",
            "name": "grey",
          },
          Object {
            "id": "36",
            "name": "halloween",
          },
          Object {
            "id": "37",
            "name": "ice",
          },
          Object {
            "id": "38",
            "name": "invisible",
          },
          Object {
            "id": "39",
            "name": "island",
          },
          Object {
            "id": "40",
            "name": "jelly",
          },
          Object {
            "id": "41",
            "name": "lemon",
          },
          Object {
            "id": "42",
            "name": "lime",
          },
          Object {
            "id": "43",
            "name": "mallow",
          },
          Object {
            "id": "44",
            "name": "maraquan",
          },
          Object {
            "id": "45",
            "name": "msp",
          },
          Object {
            "id": "46",
            "name": "mutant",
          },
          Object {
            "id": "47",
            "name": "orange",
          },
          Object {
            "id": "48",
            "name": "pea",
          },
          Object {
            "id": "49",
            "name": "peach",
          },
          Object {
            "id": "50",
            "name": "pear",
          },
          Object {
            "id": "51",
            "name": "pepper",
          },
          Object {
            "id": "52",
            "name": "pineapple",
          },
          Object {
            "id": "53",
            "name": "pink",
          },
          Object {
            "id": "54",
            "name": "pirate",
          },
          Object {
            "id": "55",
            "name": "plum",
          },
          Object {
            "id": "56",
            "name": "plushie",
          },
          Object {
            "id": "57",
            "name": "purple",
          },
          Object {
            "id": "58",
            "name": "quigukiboy",
          },
          Object {
            "id": "59",
            "name": "quigukigirl",
          },
          Object {
            "id": "60",
            "name": "rainbow",
          },
          Object {
            "id": "61",
            "name": "red",
          },
          Object {
            "id": "62",
            "name": "robot",
          },
          Object {
            "id": "63",
            "name": "royalboy",
          },
          Object {
            "id": "64",
            "name": "royalgirl",
          },
          Object {
            "id": "65",
            "name": "shadow",
          },
          Object {
            "id": "66",
            "name": "silver",
          },
          Object {
            "id": "67",
            "name": "sketch",
          },
          Object {
            "id": "68",
            "name": "skunk",
          },
          Object {
            "id": "69",
            "name": "snot",
          },
          Object {
            "id": "70",
            "name": "snow",
          },
          Object {
            "id": "71",
            "name": "speckled",
          },
          Object {
            "id": "72",
            "name": "split",
          },
          Object {
            "id": "73",
            "name": "sponge",
          },
          Object {
            "id": "74",
            "name": "spotted",
          },
          Object {
            "id": "75",
            "name": "starry",
          },
          Object {
            "id": "76",
            "name": "strawberry",
          },
          Object {
            "id": "77",
            "name": "striped",
          },
          Object {
            "id": "78",
            "name": "thornberry",
          },
          Object {
            "id": "79",
            "name": "tomato",
          },
          Object {
            "id": "80",
            "name": "tyrannian",
          },
          Object {
            "id": "81",
            "name": "usuki boy",
          },
          Object {
            "id": "82",
            "name": "usuki girl",
          },
          Object {
            "id": "83",
            "name": "white",
          },
          Object {
            "id": "84",
            "name": "yellow",
          },
          Object {
            "id": "85",
            "name": "zombie",
          },
          Object {
            "id": "86",
            "name": "onion",
          },
          Object {
            "id": "87",
            "name": "magma",
          },
          Object {
            "id": "88",
            "name": "relic",
          },
          Object {
            "id": "89",
            "name": "woodland",
          },
          Object {
            "id": "90",
            "name": "transparent",
          },
          Object {
            "id": "91",
            "name": "maractite",
          },
          Object {
            "id": "92",
            "name": "8-bit",
          },
          Object {
            "id": "93",
            "name": "swamp gas",
          },
          Object {
            "id": "94",
            "name": "water",
          },
          Object {
            "id": "95",
            "name": "wraith",
          },
          Object {
            "id": "96",
            "name": "eventide",
          },
          Object {
            "id": "97",
            "name": "elderlyboy",
          },
          Object {
            "id": "98",
            "name": "elderlygirl",
          },
          Object {
            "id": "99",
            "name": "stealthy",
          },
          Object {
            "id": "100",
            "name": "dimensional",
          },
          Object {
            "id": "101",
            "name": "agueena",
          },
          Object {
            "id": "102",
            "name": "pastel",
          },
          Object {
            "id": "103",
            "name": "ummagine",
          },
          Object {
            "id": "104",
            "name": "Polka Dot",
          },
          Object {
            "id": "105",
            "name": "Candy",
          },
          Object {
            "id": "106",
            "name": "marble",
          },
          Object {
            "id": "107",
            "name": "Steampunk",
          },
          Object {
            "id": "108",
            "name": "Toy",
          },
          Object {
            "id": "109",
            "name": "Origami",
          },
          Object {
            "id": "110",
            "name": "Oil Paint",
          },
          Object {
            "id": "111",
            "name": "Mosaic",
          },
          Object {
            "id": "112",
            "name": "Burlap",
          },
        ],
      }
    `);
    expect(queryFn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM colors",
        ],
        Array [
          "SELECT * FROM color_translations
             WHERE color_id IN (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "-1",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
            "27",
            "28",
            "29",
            "30",
            "31",
            "32",
            "33",
            "34",
            "35",
            "36",
            "37",
            "38",
            "39",
            "40",
            "41",
            "42",
            "43",
            "44",
            "45",
            "46",
            "47",
            "48",
            "49",
            "50",
            "51",
            "52",
            "53",
            "54",
            "55",
            "56",
            "57",
            "58",
            "59",
            "60",
            "61",
            "62",
            "63",
            "64",
            "65",
            "66",
            "67",
            "68",
            "69",
            "70",
            "71",
            "72",
            "73",
            "74",
            "75",
            "76",
            "77",
            "78",
            "79",
            "80",
            "81",
            "82",
            "83",
            "84",
            "85",
            "86",
            "87",
            "88",
            "89",
            "90",
            "91",
            "92",
            "93",
            "94",
            "95",
            "96",
            "97",
            "98",
            "99",
            "100",
            "101",
            "102",
            "103",
            "104",
            "105",
            "106",
            "107",
            "108",
            "109",
            "110",
            "111",
            "112",
          ],
        ],
      ]
    `);
  });
});

describe("SpeciesColorPair", () => {
  it("gets them all", async () => {
    const res = await query({
      query: gql`
        query {
          allValidSpeciesColorPairs {
            color {
              id
            }
            species {
              id
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchSnapshot();
    expect(queryFn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT species_id, color_id FROM pet_types",
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
