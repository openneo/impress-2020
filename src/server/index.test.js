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
              "id": "19784",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/028/28892/600x600.png?v2-1313418652000",
              "zone": Object {
                "depth": 37,
              },
            },
            Object {
              "id": "178150",
              "imageUrl": "https://impress-asset-images.s3.amazonaws.com/biology/000/000/036/36887/600x600.png?v2-1354240708000",
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
          "SELECT * FROM pet_states WHERE pet_type_id IN (?)
             ORDER BY glitched ASC, (mood_id = 1) DESC",
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
            "17723",
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
            "name": "Acara",
          },
          Object {
            "id": "2",
            "name": "Aisha",
          },
          Object {
            "id": "3",
            "name": "Blumaroo",
          },
          Object {
            "id": "4",
            "name": "Bori",
          },
          Object {
            "id": "5",
            "name": "Bruce",
          },
          Object {
            "id": "6",
            "name": "Buzz",
          },
          Object {
            "id": "7",
            "name": "Chia",
          },
          Object {
            "id": "8",
            "name": "Chomby",
          },
          Object {
            "id": "9",
            "name": "Cybunny",
          },
          Object {
            "id": "10",
            "name": "Draik",
          },
          Object {
            "id": "11",
            "name": "Elephante",
          },
          Object {
            "id": "12",
            "name": "Eyrie",
          },
          Object {
            "id": "13",
            "name": "Flotsam",
          },
          Object {
            "id": "14",
            "name": "Gelert",
          },
          Object {
            "id": "15",
            "name": "Gnorbu",
          },
          Object {
            "id": "16",
            "name": "Grarrl",
          },
          Object {
            "id": "17",
            "name": "Grundo",
          },
          Object {
            "id": "18",
            "name": "Hissi",
          },
          Object {
            "id": "19",
            "name": "Ixi",
          },
          Object {
            "id": "20",
            "name": "Jetsam",
          },
          Object {
            "id": "21",
            "name": "Jubjub",
          },
          Object {
            "id": "22",
            "name": "Kacheek",
          },
          Object {
            "id": "23",
            "name": "Kau",
          },
          Object {
            "id": "24",
            "name": "Kiko",
          },
          Object {
            "id": "25",
            "name": "Koi",
          },
          Object {
            "id": "26",
            "name": "Korbat",
          },
          Object {
            "id": "27",
            "name": "Kougra",
          },
          Object {
            "id": "28",
            "name": "Krawk",
          },
          Object {
            "id": "29",
            "name": "Kyrii",
          },
          Object {
            "id": "30",
            "name": "Lenny",
          },
          Object {
            "id": "31",
            "name": "Lupe",
          },
          Object {
            "id": "32",
            "name": "Lutari",
          },
          Object {
            "id": "33",
            "name": "Meerca",
          },
          Object {
            "id": "34",
            "name": "Moehog",
          },
          Object {
            "id": "35",
            "name": "Mynci",
          },
          Object {
            "id": "36",
            "name": "Nimmo",
          },
          Object {
            "id": "37",
            "name": "Ogrin",
          },
          Object {
            "id": "38",
            "name": "Peophin",
          },
          Object {
            "id": "39",
            "name": "Poogle",
          },
          Object {
            "id": "40",
            "name": "Pteri",
          },
          Object {
            "id": "41",
            "name": "Quiggle",
          },
          Object {
            "id": "42",
            "name": "Ruki",
          },
          Object {
            "id": "43",
            "name": "Scorchio",
          },
          Object {
            "id": "44",
            "name": "Shoyru",
          },
          Object {
            "id": "45",
            "name": "Skeith",
          },
          Object {
            "id": "46",
            "name": "Techo",
          },
          Object {
            "id": "47",
            "name": "Tonu",
          },
          Object {
            "id": "48",
            "name": "Tuskaninny",
          },
          Object {
            "id": "49",
            "name": "Uni",
          },
          Object {
            "id": "50",
            "name": "Usul",
          },
          Object {
            "id": "51",
            "name": "Wocky",
          },
          Object {
            "id": "52",
            "name": "Xweetok",
          },
          Object {
            "id": "53",
            "name": "Yurble",
          },
          Object {
            "id": "54",
            "name": "Zafara",
          },
          Object {
            "id": "55",
            "name": "Vandagyre",
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
            "id": "1",
            "name": "Alien",
          },
          Object {
            "id": "2",
            "name": "Apple",
          },
          Object {
            "id": "3",
            "name": "Asparagus",
          },
          Object {
            "id": "4",
            "name": "Aubergine",
          },
          Object {
            "id": "5",
            "name": "Avocado",
          },
          Object {
            "id": "6",
            "name": "Baby",
          },
          Object {
            "id": "7",
            "name": "Biscuit",
          },
          Object {
            "id": "8",
            "name": "Blue",
          },
          Object {
            "id": "9",
            "name": "Blueberry",
          },
          Object {
            "id": "10",
            "name": "Brown",
          },
          Object {
            "id": "11",
            "name": "Camouflage",
          },
          Object {
            "id": "12",
            "name": "Carrot",
          },
          Object {
            "id": "13",
            "name": "Checkered",
          },
          Object {
            "id": "14",
            "name": "Chocolate",
          },
          Object {
            "id": "15",
            "name": "Chokato",
          },
          Object {
            "id": "16",
            "name": "Christmas",
          },
          Object {
            "id": "17",
            "name": "Clay",
          },
          Object {
            "id": "18",
            "name": "Cloud",
          },
          Object {
            "id": "19",
            "name": "Coconut",
          },
          Object {
            "id": "20",
            "name": "Custard",
          },
          Object {
            "id": "21",
            "name": "Darigan",
          },
          Object {
            "id": "22",
            "name": "Desert",
          },
          Object {
            "id": "23",
            "name": "Disco",
          },
          Object {
            "id": "24",
            "name": "Durian",
          },
          Object {
            "id": "25",
            "name": "Electric",
          },
          Object {
            "id": "26",
            "name": "Faerie",
          },
          Object {
            "id": "27",
            "name": "Fire",
          },
          Object {
            "id": "28",
            "name": "Garlic",
          },
          Object {
            "id": "29",
            "name": "Ghost",
          },
          Object {
            "id": "30",
            "name": "Glowing",
          },
          Object {
            "id": "31",
            "name": "Gold",
          },
          Object {
            "id": "32",
            "name": "Gooseberry",
          },
          Object {
            "id": "33",
            "name": "Grape",
          },
          Object {
            "id": "34",
            "name": "Green",
          },
          Object {
            "id": "35",
            "name": "Grey",
          },
          Object {
            "id": "36",
            "name": "Halloween",
          },
          Object {
            "id": "37",
            "name": "Ice",
          },
          Object {
            "id": "38",
            "name": "Invisible",
          },
          Object {
            "id": "39",
            "name": "Island",
          },
          Object {
            "id": "40",
            "name": "Jelly",
          },
          Object {
            "id": "41",
            "name": "Lemon",
          },
          Object {
            "id": "42",
            "name": "Lime",
          },
          Object {
            "id": "43",
            "name": "Mallow",
          },
          Object {
            "id": "44",
            "name": "Maraquan",
          },
          Object {
            "id": "45",
            "name": "Msp",
          },
          Object {
            "id": "46",
            "name": "Mutant",
          },
          Object {
            "id": "47",
            "name": "Orange",
          },
          Object {
            "id": "48",
            "name": "Pea",
          },
          Object {
            "id": "49",
            "name": "Peach",
          },
          Object {
            "id": "50",
            "name": "Pear",
          },
          Object {
            "id": "51",
            "name": "Pepper",
          },
          Object {
            "id": "52",
            "name": "Pineapple",
          },
          Object {
            "id": "53",
            "name": "Pink",
          },
          Object {
            "id": "54",
            "name": "Pirate",
          },
          Object {
            "id": "55",
            "name": "Plum",
          },
          Object {
            "id": "56",
            "name": "Plushie",
          },
          Object {
            "id": "57",
            "name": "Purple",
          },
          Object {
            "id": "58",
            "name": "Quigukiboy",
          },
          Object {
            "id": "59",
            "name": "Quigukigirl",
          },
          Object {
            "id": "60",
            "name": "Rainbow",
          },
          Object {
            "id": "61",
            "name": "Red",
          },
          Object {
            "id": "62",
            "name": "Robot",
          },
          Object {
            "id": "63",
            "name": "Royalboy",
          },
          Object {
            "id": "64",
            "name": "Royalgirl",
          },
          Object {
            "id": "65",
            "name": "Shadow",
          },
          Object {
            "id": "66",
            "name": "Silver",
          },
          Object {
            "id": "67",
            "name": "Sketch",
          },
          Object {
            "id": "68",
            "name": "Skunk",
          },
          Object {
            "id": "69",
            "name": "Snot",
          },
          Object {
            "id": "70",
            "name": "Snow",
          },
          Object {
            "id": "71",
            "name": "Speckled",
          },
          Object {
            "id": "72",
            "name": "Split",
          },
          Object {
            "id": "73",
            "name": "Sponge",
          },
          Object {
            "id": "74",
            "name": "Spotted",
          },
          Object {
            "id": "75",
            "name": "Starry",
          },
          Object {
            "id": "76",
            "name": "Strawberry",
          },
          Object {
            "id": "77",
            "name": "Striped",
          },
          Object {
            "id": "78",
            "name": "Thornberry",
          },
          Object {
            "id": "79",
            "name": "Tomato",
          },
          Object {
            "id": "80",
            "name": "Tyrannian",
          },
          Object {
            "id": "81",
            "name": "Usuki boy",
          },
          Object {
            "id": "82",
            "name": "Usuki girl",
          },
          Object {
            "id": "83",
            "name": "White",
          },
          Object {
            "id": "84",
            "name": "Yellow",
          },
          Object {
            "id": "85",
            "name": "Zombie",
          },
          Object {
            "id": "86",
            "name": "Onion",
          },
          Object {
            "id": "87",
            "name": "Magma",
          },
          Object {
            "id": "88",
            "name": "Relic",
          },
          Object {
            "id": "89",
            "name": "Woodland",
          },
          Object {
            "id": "90",
            "name": "Transparent",
          },
          Object {
            "id": "91",
            "name": "Maractite",
          },
          Object {
            "id": "92",
            "name": "8-bit",
          },
          Object {
            "id": "93",
            "name": "Swamp gas",
          },
          Object {
            "id": "94",
            "name": "Water",
          },
          Object {
            "id": "95",
            "name": "Wraith",
          },
          Object {
            "id": "96",
            "name": "Eventide",
          },
          Object {
            "id": "97",
            "name": "Elderlyboy",
          },
          Object {
            "id": "98",
            "name": "Elderlygirl",
          },
          Object {
            "id": "99",
            "name": "Stealthy",
          },
          Object {
            "id": "100",
            "name": "Dimensional",
          },
          Object {
            "id": "101",
            "name": "Agueena",
          },
          Object {
            "id": "102",
            "name": "Pastel",
          },
          Object {
            "id": "103",
            "name": "Ummagine",
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
            "name": "Marble",
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
          "SELECT * FROM colors WHERE prank = 0",
        ],
        Array [
          "SELECT * FROM color_translations
             WHERE color_id IN (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) AND locale = \\"en\\"",
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
