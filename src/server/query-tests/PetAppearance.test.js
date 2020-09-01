const gql = require("graphql-tag");
const { query, getDbCalls } = require("./setup.js");

describe("PetAppearance", () => {
  it("loads for species and color", async () => {
    const res = await query({
      query: gql`
        query {
          petAppearance(speciesId: "54", colorId: "75", pose: HAPPY_FEM) {
            id

            species {
              id
              name
            }

            color {
              id
              name
              isStandard
            }

            layers {
              id
              imageUrl(size: SIZE_600)
              svgUrl
              zone {
                depth
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
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?)",
          Array [
            "54",
            "75",
          ],
        ],
        Array [
          "SELECT * FROM pet_states
             WHERE pet_type_id IN (?)
             ORDER BY (mood_id IS NULL) ASC, mood_id ASC, female DESC,
                      unconverted DESC, glitched ASC, id DESC",
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
          "SELECT * FROM species_translations
             WHERE species_id IN (?) AND locale = \\"en\\"",
          Array [
            "54",
          ],
        ],
        Array [
          "SELECT * FROM color_translations
             WHERE color_id IN (?) AND locale = \\"en\\"",
          Array [
            "75",
          ],
        ],
        Array [
          "SELECT * FROM colors WHERE id IN (?) AND prank = 0",
          Array [
            "75",
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

  it("loads multiple for species and color", async () => {
    const res = await query({
      query: gql`
        query {
          petAppearances(speciesId: "54", colorId: "75") {
            id

            species {
              id
              name
            }

            color {
              id
              name
            }

            bodyId
            petStateId
            pose
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
          "SELECT * FROM pet_states
             WHERE pet_type_id IN (?)
             ORDER BY (mood_id IS NULL) ASC, mood_id ASC, female DESC,
                      unconverted DESC, glitched ASC, id DESC",
          Array [
            "2",
          ],
        ],
        Array [
          "SELECT sa.*, rel.parent_id FROM swf_assets sa
             INNER JOIN parents_swf_assets rel ON
               rel.parent_type = \\"PetState\\" AND
               rel.swf_asset_id = sa.id
             WHERE rel.parent_id IN (?,?,?,?,?,?,?,?)",
          Array [
            "17723",
            "17742",
            "5991",
            "436",
            "10014",
            "11089",
            "4751",
            "2",
          ],
        ],
        Array [
          "SELECT * FROM species_translations
             WHERE species_id IN (?) AND locale = \\"en\\"",
          Array [
            "54",
          ],
        ],
        Array [
          "SELECT * FROM color_translations
             WHERE color_id IN (?) AND locale = \\"en\\"",
          Array [
            "75",
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

  it("loads unconverted appearance", async () => {
    const res = await query({
      query: gql`
        query {
          petAppearance(speciesId: "1", colorId: "63", pose: UNCONVERTED) {
            id

            species {
              id
              name
            }

            color {
              id
              name
              isStandard
            }

            layers {
              id
              imageUrl(size: SIZE_600)
              svgUrl
              zone {
                depth
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
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?)",
          Array [
            "1",
            "63",
          ],
        ],
        Array [
          "SELECT * FROM pet_states
             WHERE pet_type_id IN (?)
             ORDER BY (mood_id IS NULL) ASC, mood_id ASC, female DESC,
                      unconverted DESC, glitched ASC, id DESC",
          Array [
            "2274",
          ],
        ],
        Array [
          "SELECT sa.*, rel.parent_id FROM swf_assets sa
             INNER JOIN parents_swf_assets rel ON
               rel.parent_type = \\"PetState\\" AND
               rel.swf_asset_id = sa.id
             WHERE rel.parent_id IN (?)",
          Array [
            "2571",
          ],
        ],
        Array [
          "SELECT * FROM species_translations
             WHERE species_id IN (?) AND locale = \\"en\\"",
          Array [
            "1",
          ],
        ],
        Array [
          "SELECT * FROM color_translations
             WHERE color_id IN (?) AND locale = \\"en\\"",
          Array [
            "63",
          ],
        ],
        Array [
          "SELECT * FROM colors WHERE id IN (?) AND prank = 0",
          Array [
            "63",
          ],
        ],
        Array [
          "SELECT * FROM zones WHERE id IN (?)",
          Array [
            "46",
          ],
        ],
      ]
    `);
  });
});
