const gql = require("graphql-tag");
const {
  query,
  getDbCalls,
  clearDbCalls,
  useTestDb,
  connectToDb,
} = require("./setup.js");

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

  it("models new pet and item data", async () => {
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
          petAppearance(colorId: "75", speciesId: "54", pose: SAD_MASC) {
            id
            pose
            layers {
              id
              swfUrl
            }
            restrictedZones {
              id
            }
          }

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
    expect(getDbCalls()).toMatchSnapshot();
  });

  it("models updated item data", async () => {
    useTestDb();

    // First, write a fake version of the Jewelled Staff to the database.
    // It's mostly the real data, except we changed rarity_index,
    // thumbnail_url, translated name, and translated description.
    const db = await connectToDb();
    await Promise.all([
      db.query(
        `INSERT INTO items (id, zones_restrict, thumbnail_url, category,
                            type, rarity_index, price, weight_lbs)
           VALUES (43397, "00000000000000000000000000000000000000000000000",
                   "http://example.com/favicon.ico", "Clothes", "Clothes", 101,
                   0, 1);`
      ),
      db.query(
        `INSERT INTO item_translations (item_id, locale, name, description,
                                        rarity)
           VALUES (43397, "en", "Bejewelled Staffo",
                   "This staff is really neat and good!", "Artifact")`
      ),
    ]);

    clearDbCalls();

    // Then, load a pet wearing this. It should trigger an UPDATE for the item
    // and its translation, and return the new names in the query.
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
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    const itemData = res.data.petOnNeopetsDotCom.items.find(
      (item) => item.id === "43397"
    );
    expect(itemData).toEqual({
      id: "43397",
      name: "Jewelled Staff",
      description: "This jewelled staff shines with a magical light.",
      thumbnailUrl: "http://images.neopets.com/items/mall_staff_jewelled.gif",
      rarityIndex: 500,
    });
    expect(getDbCalls()).toMatchSnapshot();

    clearDbCalls();

    // Finally, load the item. It should have the updated values.
    const res2 = await query({
      query: gql`
        query {
          item(id: "43397") {
            id
            name
            description
            thumbnailUrl
            rarityIndex
          }
        }
      `,
    });

    expect(res2).toHaveNoErrors();
    expect(res2.data.item).toEqual({
      id: "43397",
      name: "Jewelled Staff",
      description: "This jewelled staff shines with a magical light.",
      thumbnailUrl: "http://images.neopets.com/items/mall_staff_jewelled.gif",
      rarityIndex: 500,
    });
    expect(getDbCalls()).toMatchSnapshot();
  });
});
