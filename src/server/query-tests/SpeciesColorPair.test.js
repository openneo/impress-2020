const gql = require("graphql-tag");
const { query, getDbCalls } = require("./setup.js");

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
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT species_id, color_id FROM pet_types",
        ],
      ]
    `);
  });
});
