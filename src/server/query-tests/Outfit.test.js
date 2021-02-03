import gql from "graphql-tag";
import { query, getDbCalls } from "./setup.js";

describe("Outfit", () => {
  it("loads an outfit by ID", async () => {
    const res = await query({
      query: gql`
        query {
          outfit(id: "31856") {
            id
            name

            petAppearance {
              id

              color {
                id
                name
              }

              species {
                id
                name
              }

              pose
            }

            wornItems {
              id
              name
            }

            closetedItems {
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
          "SELECT * FROM outfits WHERE id IN (?)",
          Array [
            "31856",
          ],
        ],
        Array [
          "SELECT * FROM item_outfit_relationships WHERE outfit_id IN (?)",
          Array [
            "31856",
          ],
        ],
        Array [
          "SELECT * FROM pet_states WHERE id IN (?)",
          Array [
            "3951",
          ],
        ],
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?,?,?,?,?,?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "38916",
            "51054",
            "38914",
            "36125",
            "36467",
            "47075",
            "47056",
            "39662",
            "56706",
            "38915",
            "56398",
          ],
        ],
        Array [
          "SELECT * FROM pet_types WHERE id IN (?)",
          Array [
            "33",
          ],
        ],
        Array [
          "SELECT * FROM color_translations
             WHERE color_id IN (?) AND locale = \\"en\\"",
          Array [
            "34",
          ],
        ],
        Array [
          "SELECT * FROM species_translations
             WHERE species_id IN (?) AND locale = \\"en\\"",
          Array [
            "54",
          ],
        ],
      ]
    `);
  });
});
