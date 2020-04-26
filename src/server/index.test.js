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
            description
            thumbnailUrl
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchSnapshot();
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
    expect(res.data).toMatchSnapshot();
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
    expect(res.data).toMatchSnapshot();
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
    expect(res.data).toMatchSnapshot();
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
    expect(res.data).toMatchSnapshot();
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
          "SELECT DISTINCT items.*, t.name FROM items
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
    expect(res.data).toMatchSnapshot();
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
          "SELECT DISTINCT items.*, t.name FROM items
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
    expect(res.data).toMatchSnapshot();
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
          "SELECT DISTINCT items.*, t.name FROM items
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
    expect(res.data).toMatchSnapshot();
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
    expect(res.data).toMatchSnapshot();
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

describe("Pet", () => {
  it("looks up a pet", async () => {
    const res = await query({
      query: gql`
        query {
          petOnNeopetsDotCom(petName: "roopal27") {
            species {
              id
            }
            color {
              id
            }
            items {
              id
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchSnapshot();
    expect(queryFn.mock.calls).toMatchInlineSnapshot(`Array []`);
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
