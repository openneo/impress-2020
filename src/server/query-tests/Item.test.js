const gql = require("graphql-tag");
const { query, getDbCalls } = require("./setup.js");

describe("Item", () => {
  it("loads metadata", async () => {
    const res = await query({
      query: gql`
        query {
          items(ids: ["38913", "38911", "38912", "55788", "77530", "78104"]) {
            id
            name
            description
            thumbnailUrl
            rarityIndex
            isNc
            manualSpecialColor {
              id
              name
            }
            explicitlyBodySpecific
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchSnapshot();
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "38913",
            "38911",
            "38912",
            "55788",
            "77530",
            "78104",
          ],
        ],
        Array [
          "SELECT * FROM items WHERE id IN (?,?,?,?,?,?)",
          Array [
            "38913",
            "38911",
            "38912",
            "55788",
            "77530",
            "78104",
          ],
        ],
        Array [
          "SELECT * FROM color_translations
             WHERE color_id IN (?) AND locale = \\"en\\"",
          Array [
            "44",
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
                remoteId
                imageUrl(size: SIZE_600)
                svgUrl
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
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?,?,?) AND locale = \\"en\\"",
          Array [
            "38912",
            "38911",
            "37375",
          ],
        ],
        Array [
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?)",
          Array [
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
          "SELECT * FROM items WHERE id IN (?,?,?)",
          Array [
            "38912",
            "38911",
            "37375",
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

  it("returns empty appearance for incompatible items", async () => {
    const res = await query({
      query: gql`
        query {
          items(ids: ["38912"]) {
            id
            name

            appearanceOn(speciesId: "1", colorId: "8") {
              layers {
                id
              }

              # Pay particular attention to this: normally this item restricts
              # zones, but not when the appearance is empty!
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
              "layers": Array [],
              "restrictedZones": Array [],
            },
            "id": "38912",
            "name": "Zafara Agent Robe",
          },
        ],
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?) AND locale = \\"en\\"",
          Array [
            "38912",
          ],
        ],
        Array [
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?)",
          Array [
            "1",
            "8",
          ],
        ],
        Array [
          "SELECT sa.*, rel.parent_id FROM swf_assets sa
             INNER JOIN parents_swf_assets rel ON
               rel.parent_type = \\"Item\\" AND
               rel.swf_asset_id = sa.id
             WHERE (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0))",
          Array [
            "38912",
            "93",
          ],
        ],
      ]
    `);
  });

  it("skips appearance data for audio assets", async () => {
    const res = await query({
      query: gql`
        query {
          items(ids: ["42829"]) {
            id
            name

            appearanceOn(speciesId: "54", colorId: "75") {
              layers {
                id
                imageUrl(size: SIZE_600)
                svgUrl
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
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?) AND locale = \\"en\\"",
          Array [
            "42829",
          ],
        ],
        Array [
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?)",
          Array [
            "54",
            "75",
          ],
        ],
        Array [
          "SELECT sa.*, rel.parent_id FROM swf_assets sa
             INNER JOIN parents_swf_assets rel ON
               rel.parent_type = \\"Item\\" AND
               rel.swf_asset_id = sa.id
             WHERE (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0))",
          Array [
            "42829",
            "180",
          ],
        ],
        Array [
          "SELECT * FROM items WHERE id IN (?)",
          Array [
            "42829",
          ],
        ],
      ]
    `);
  });

  it("loads items that need models", async () => {
    jest.setTimeout(20000);

    const res = await query({
      query: gql`
        query {
          itemsThatNeedModels {
            id
            name
            speciesThatNeedModels {
              id
              name
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchSnapshot();
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "
            SELECT items.id, 
              GROUP_CONCAT(DISTINCT pet_types.species_id ORDER BY pet_types.species_id)
                AS modeled_species_ids,
              -- Vandagyre was added on 2014-11-14, so we add some buffer here.
              -- TODO: Some later Dyeworks items don't support Vandagyre.
              -- Add a manual db flag?
              items.created_at >= \\"2014-12-01\\" AS supports_vandagyre
            FROM items
            INNER JOIN parents_swf_assets psa
              ON psa.parent_type = \\"Item\\" AND psa.parent_id = items.id
            INNER JOIN swf_assets
              ON swf_assets.id = psa.swf_asset_id
            INNER JOIN pet_types
              ON pet_types.body_id = swf_assets.body_id
            WHERE
              pet_types.color_id = \\"8\\"
            GROUP BY items.id
            HAVING
              NOT (
                -- Single species (probably just their item)
                count(DISTINCT pet_types.species_id) = 1
                -- All species modeled
                OR modeled_species_ids = \\"1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55\\"
                -- All species modeled except Vandagyre, for items that don't support it
                OR (NOT supports_vandagyre AND modeled_species_ids = \\"1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54\\")
                -- No species (either an All Bodies item, or a Capsule type thing)
                OR modeled_species_ids = \\"\\"
              )
            ORDER BY items.id
        ",
        ],
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "24534",
            "33850",
            "34167",
            "36125",
            "36126",
            "36245",
            "36678",
            "36729",
            "36907",
            "37354",
            "37368",
            "37840",
            "38003",
            "38130",
            "38214",
            "38216",
            "38225",
            "38311",
            "38314",
            "38391",
            "39147",
            "39148",
            "39149",
            "39313",
            "39817",
            "39884",
            "41216",
            "41690",
            "41691",
            "42169",
            "42171",
            "42448",
            "42449",
            "42475",
            "42478",
            "42544",
            "42546",
            "42823",
            "42885",
            "42886",
            "42993",
            "42994",
            "43079",
            "43081",
            "43677",
            "43694",
            "44456",
            "44507",
            "45301",
            "47054",
            "47066",
            "49408",
            "50669",
            "50670",
            "50671",
            "50672",
            "51646",
            "51651",
            "51653",
            "51654",
            "51655",
            "52684",
            "53063",
            "53324",
            "53325",
            "53762",
            "53818",
            "53820",
            "54436",
            "55596",
            "55673",
            "55675",
            "56717",
            "57295",
            "58285",
            "59848",
            "60751",
            "62302",
            "62939",
            "63077",
            "63464",
            "64195",
            "64387",
            "66493",
            "67317",
            "68228",
            "68293",
            "68470",
            "69311",
            "69743",
            "69748",
            "69754",
            "69755",
            "69756",
            "69761",
            "69772",
            "69773",
            "69782",
            "69998",
            "70843",
            "71110",
            "71658",
            "71937",
            "71938",
            "72188",
            "72553",
            "72897",
            "72898",
            "72899",
            "72906",
            "72907",
            "72908",
            "72912",
            "72913",
            "72914",
            "73094",
            "73405",
            "73598",
            "73707",
            "73708",
            "73724",
            "73766",
            "74055",
            "74259",
            "74260",
            "74261",
            "74314",
            "74315",
            "75197",
            "75198",
            "75199",
            "76108",
            "76109",
            "77441",
            "77442",
            "78318",
            "78320",
            "78560",
            "78754",
            "79847",
            "80024",
            "80427",
            "80428",
            "80774",
            "81060",
            "81061",
            "81062",
            "81144",
            "81145",
            "81229",
            "81230",
            "81232",
            "81233",
            "81234",
            "81237",
            "81238",
            "81240",
            "81241",
            "81242",
            "81243",
            "81245",
            "81246",
            "81274",
            "81371",
            "81396",
            "81547",
            "81563",
            "81630",
          ],
        ],
        Array [
          "SELECT * FROM species_translations
             WHERE species_id IN (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "18",
            "24",
            "25",
            "48",
            "49",
            "20",
            "6",
            "27",
            "41",
            "42",
            "5",
            "47",
            "50",
            "51",
            "4",
            "11",
            "12",
            "14",
            "23",
            "37",
            "21",
            "1",
            "7",
            "8",
            "15",
            "16",
            "17",
            "19",
            "22",
            "26",
            "30",
            "32",
            "34",
            "36",
            "39",
            "40",
            "44",
            "54",
            "31",
            "33",
            "3",
            "9",
            "28",
            "29",
            "35",
            "38",
            "43",
            "45",
            "46",
            "52",
            "53",
            "2",
            "10",
            "13",
            "55",
          ],
        ],
      ]
    `);
  });
});
