const gql = require("graphql-tag");
const { query, getDbCalls } = require("./setup.js");

describe("PetAppearance", () => {
  it("loads for species and color", async () => {
    const res = await query({
      query: gql`
        query {
          petAppearance(speciesId: "54", colorId: "75", pose: HAPPY_FEM) {
            layers {
              id
              imageUrl(size: SIZE_600)
              svgUrl
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
             WHERE pet_type_id IN (?) AND glitched = 0
             ORDER BY (mood_id = 1) DESC",
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

  it("loads multiple for species and color", async () => {
    const res = await query({
      query: gql`
        query {
          petAppearances(speciesId: "54", colorId: "75") {
            id
            bodyId
            petStateId
            pose
            genderPresentation
            emotion
            approximateThumbnailUrl
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
             WHERE pet_type_id IN (?) AND glitched = 0
             ORDER BY (mood_id = 1) DESC",
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
            "10014",
            "11089",
            "5991",
            "436",
            "2",
            "4751",
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
