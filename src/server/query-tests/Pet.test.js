const gql = require("graphql-tag");
const { query, getDbCalls } = require("./setup.js");

describe("Pet", () => {
  it("looks up a pet", async () => {
    const res = await query({
      query: gql`
        query {
          petOnNeopetsDotCom(petName: "roopal27") {
            species {
              id
              name
            }
            color {
              id
              name
            }
            pose
            items {
              id
              name
              description
              thumbnailUrl
              rarityIndex
              isNc
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
          "SELECT * FROM species_translations
             WHERE species_id IN (?) AND locale = \\"en\\"",
          Array [
            54,
          ],
        ],
        Array [
          "SELECT * FROM color_translations
             WHERE color_id IN (?) AND locale = \\"en\\"",
          Array [
            75,
          ],
        ],
      ]
    `);
  });
});
