const gql = require("graphql-tag");
const { query, getDbCalls, clearDbCalls, useTestDb } = require("./setup.js");

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

  it("models new item data", async () => {
    useTestDb();

    const res = await query({
      query: gql`
        query {
          petOnNeopetsDotCom(petName: "roopal27") {
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
    expect(getDbCalls()).toMatchSnapshot();

    clearDbCalls();

    const res2 = await query({
      query: gql`
        query {
          items(
            ids: [
              "37229"
              "37375"
              "38911"
              "38912"
              "38913"
              "43014"
              "43397"
              "48313"
            ]
          ) {
            id
            name
            description
            thumbnailUrl
            rarityIndex
            isNc
            createdAt
          }
        }
      `,
    });

    expect(res2).toHaveNoErrors();
    expect(res2.data).toMatchSnapshot();
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?,?,?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "37229",
            "37375",
            "38911",
            "38912",
            "38913",
            "43014",
            "43397",
            "48313",
          ],
        ],
        Array [
          "SELECT * FROM items WHERE id IN (?,?,?,?,?,?,?,?)",
          Array [
            "37229",
            "37375",
            "38911",
            "38912",
            "38913",
            "43014",
            "43397",
            "48313",
          ],
        ],
      ]
    `);
  });
});
