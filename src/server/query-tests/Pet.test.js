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
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?)",
          Array [
            "54",
            "75",
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
          "SELECT * FROM swf_assets WHERE (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?) OR (type = ? AND remote_id = ?)",
          Array [
            "object",
            "6829",
            "object",
            "14855",
            "object",
            "14856",
            "object",
            "14857",
            "object",
            "36414",
            "object",
            "39646",
            "object",
            "51959",
            "object",
            "56478",
            "biology",
            "7942",
            "biology",
            "7941",
            "biology",
            "24008",
            "biology",
            "21060",
            "biology",
            "21057",
            "biology",
            "7946",
          ],
        ],
        Array [
          "SELECT * FROM pet_states WHERE (pet_type_id = ? AND swf_asset_ids = ?)",
          Array [
            "2",
            "7941,7942,7946,21057,21060,24008",
          ],
        ],
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
            bodyId

            restrictedZones {
              id
            }
            layers {
              id
              swfUrl
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

    clearDbCalls();

    // If we load the pet again, it should only make SELECT queries, not
    // INSERT or UPDATE.
    await query({
      query: gql`
        query {
          petOnNeopetsDotCom(petName: "roopal27") {
            items {
              id
            }
          }
        }
      `,
    });

    const dbCalls = getDbCalls();
    for (const [query, _] of dbCalls) {
      expect(query).toMatch(/SELECT/);
      expect(query).not.toMatch(/INSERT/);
      expect(query).not.toMatch(/UPDATE/);
    }
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

  it("sets bodyId=0 after seeing it on two body types", async () => {
    useTestDb();

    // First, write the Moon and Stars Background SWF to the database, but with
    // the Standard Acara body ID set.
    const db = await connectToDb();
    await db.query(
      `INSERT INTO swf_assets (type, remote_id, url, zone_id, zones_restrict,
                               created_at, body_id)
         VALUES ("object", 6829, "http://images.neopets.com/cp/items/swf/000/000/006/6829_1707e50385.swf",
                 3, "", CURRENT_TIMESTAMP(), 93);`
    );

    clearDbCalls();

    // Then, model a Zafara wearing it.
    await query({
      query: gql`
        query {
          petOnNeopetsDotCom(petName: "roopal27") {
            id
          }
        }
      `,
    });

    expect(getDbCalls()).toMatchSnapshot("db");

    // The body ID should be 0 now.
    const [rows, _] = await db.query(
      `SELECT body_id FROM swf_assets
       WHERE type = "object" AND remote_id = 6829;`
    );
    expect(rows[0].body_id).toEqual(0);
  });

  it("models unconverted pets", async () => {
    useTestDb();

    // First, model an unconverted pet, and check its pose and layers.
    const res = await query({
      query: gql`
        query {
          petOnNeopetsDotCom(petName: "Marishka82") {
            pose
            petAppearance {
              id
              pose
              layers {
                id
              }
            }
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();

    const modeledPet = res.data.petOnNeopetsDotCom;
    expect(modeledPet.pose).toEqual("UNCONVERTED");
    expect(modeledPet.petAppearance.pose).toEqual("UNCONVERTED");
    expect(modeledPet.petAppearance.layers).toHaveLength(1);

    // Then, request the corresponding appearance fresh from the db, and
    // confirm we get the same back as when we modeled the pet.
    const res2 = await query({
      query: gql`
        query {
          petAppearance(speciesId: "31", colorId: "36", pose: UNCONVERTED) {
            id
            layers {
              id
            }
          }
        }
      `,
    });
    expect(res2).toHaveNoErrors();

    const petAppearance = res2.data.petAppearance;
    expect(petAppearance.id).toEqual(modeledPet.petAppearance.id);
    expect(petAppearance.layers.map((l) => l.id)).toEqual(
      modeledPet.petAppearance.layers.map((l) => l.id)
    );
  });
});
