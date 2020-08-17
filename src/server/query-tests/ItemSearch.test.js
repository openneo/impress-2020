const gql = require("graphql-tag");
const { query, getDbCalls } = require("./setup.js");

describe("ItemSearch", () => {
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
    expect(getDbCalls()).toMatchInlineSnapshot(`
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
    expect(getDbCalls()).toMatchInlineSnapshot(`
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
              appearanceOn(speciesId: "54", colorId: "75") {
                layers {
                  id
                }
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
        Array [
          "SELECT sa.*, rel.parent_id FROM swf_assets sa
             INNER JOIN parents_swf_assets rel ON
               rel.parent_type = \\"Item\\" AND
               rel.swf_asset_id = sa.id
             WHERE (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0))",
          Array [
            "74967",
            "180",
            "49026",
            "180",
            "67242",
            "180",
            "64177",
            "180",
            "69995",
            "180",
            "62375",
            "180",
            "56654",
            "180",
            "62322",
            "180",
            "58733",
            "180",
            "80401",
            "180",
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
    expect(getDbCalls()).toMatchInlineSnapshot(`
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
