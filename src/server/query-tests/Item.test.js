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
});
