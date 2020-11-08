const gql = require("graphql-tag");
const {
  query,
  mutate,
  getDbCalls,
  useTestDb,
  logInAsTestUser,
  createItem,
} = require("./setup.js");

describe("Item", () => {
  it("loads metadata", async () => {
    const res = await query({
      query: gql`
        query {
          items(
            ids: ["38913", "38911", "38912", "55788", "60671", "77530", "78104"]
          ) {
            id
            name
            description
            thumbnailUrl
            rarityIndex
            isNc
            isPb
            createdAt
            manualSpecialColor {
              id
              name
            }
            explicitlyBodySpecific
            allOccupiedZones {
              label
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
          "SELECT * FROM item_translations WHERE item_id IN (?,?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "38913",
            "38911",
            "38912",
            "55788",
            "60671",
            "77530",
            "78104",
          ],
        ],
        Array [
          "SELECT * FROM items WHERE id IN (?,?,?,?,?,?,?)",
          Array [
            "38913",
            "38911",
            "38912",
            "55788",
            "60671",
            "77530",
            "78104",
          ],
        ],
        Array [
          "SELECT items.id, GROUP_CONCAT(DISTINCT sa.zone_id) AS zone_ids FROM items
             INNER JOIN parents_swf_assets psa
               ON psa.parent_type = \\"Item\\" AND psa.parent_id = items.id
             INNER JOIN swf_assets sa ON sa.id = psa.swf_asset_id
             WHERE items.id IN (?, ?, ?, ?, ?, ?, ?)
             GROUP BY items.id;",
          Array [
            "38913",
            "38911",
            "38912",
            "55788",
            "60671",
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
        Array [
          "SELECT * FROM zone_translations WHERE zone_id IN (?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "25",
            "40",
            "26",
            "46",
            "23",
            "3",
          ],
        ],
      ]
    `);
  });

  it("loads items by name", async () => {
    const res = await query({
      query: gql`
        query {
          itemByName(name: "Moon and Stars Background") {
            id
            name
            thumbnailUrl
          }
          itemsByName(names: ["Zafara Agent Robe", "pile of dung"]) {
            id
            name
            thumbnailUrl
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchSnapshot("data");
    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("loads appearance data", async () => {
    const res = await query({
      query: gql`
        query {
          items(
            ids: [
              "38912" # Zafara Agent Robe
              "38911" # Zafara Agent Hood
              "37375" # Moon and Stars Background
              "78244" # Bubbles on Water Foreground
            ]
          ) {
            id
            name

            appearanceOn(speciesId: "54", colorId: "75") {
              layers {
                id
                remoteId
                imageUrl(size: SIZE_600)
                svgUrl
                canvasMovieLibraryUrl
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
          "SELECT * FROM item_translations WHERE item_id IN (?,?,?,?) AND locale = \\"en\\"",
          Array [
            "38912",
            "38911",
            "37375",
            "78244",
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
             WHERE (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0))",
          Array [
            "38912",
            "180",
            "38911",
            "180",
            "37375",
            "180",
            "78244",
            "180",
          ],
        ],
        Array [
          "SELECT * FROM items WHERE id IN (?,?,?,?)",
          Array [
            "38912",
            "38911",
            "37375",
            "78244",
          ],
        ],
        Array [
          "SELECT * FROM zones WHERE id IN (?,?,?,?)",
          Array [
            "26",
            "40",
            "3",
            "45",
          ],
        ],
        Array [
          "SELECT * FROM zone_translations WHERE zone_id IN (?,?,?,?) AND locale = \\"en\\"",
          Array [
            "26",
            "40",
            "3",
            "45",
          ],
        ],
      ]
    `);
  });

  it("returns empty appearance for incompatible items", async () => {
    const res = await query({
      query: gql`
        query {
          items(ids: ["38912"]) {
            id
            name

            appearanceOn(speciesId: "1", colorId: "8") {
              layers {
                id
              }

              # Pay particular attention to this: normally this item restricts
              # zones, but not when the appearance is empty!
              restrictedZones {
                id
              }
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "items": Array [
          Object {
            "appearanceOn": Object {
              "layers": Array [],
              "restrictedZones": Array [],
            },
            "id": "38912",
            "name": "Zafara Agent Robe",
          },
        ],
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?) AND locale = \\"en\\"",
          Array [
            "38912",
          ],
        ],
        Array [
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?)",
          Array [
            "1",
            "8",
          ],
        ],
        Array [
          "SELECT sa.*, rel.parent_id FROM swf_assets sa
             INNER JOIN parents_swf_assets rel ON
               rel.parent_type = \\"Item\\" AND
               rel.swf_asset_id = sa.id
             WHERE (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0))",
          Array [
            "38912",
            "93",
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

  it("loads whether we own/want items", async () => {
    await logInAsTestUser();

    const res = await query({
      query: gql`
        query {
          items(ids: ["38913", "39945", "39948"]) {
            id
            currentUserOwnsThis
            currentUserWantsThis
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "items": Array [
          Object {
            "currentUserOwnsThis": false,
            "currentUserWantsThis": false,
            "id": "38913",
          },
          Object {
            "currentUserOwnsThis": false,
            "currentUserWantsThis": true,
            "id": "39945",
          },
          Object {
            "currentUserOwnsThis": true,
            "currentUserWantsThis": false,
            "id": "39948",
          },
        ],
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT closet_hangers.*, item_translations.name as item_name FROM closet_hangers
             INNER JOIN items ON items.id = closet_hangers.item_id
             INNER JOIN item_translations ON
               item_translations.item_id = items.id AND locale = \\"en\\"
             WHERE user_id IN (?)
             ORDER BY item_name",
          Array [
            "44743",
          ],
        ],
      ]
    `);
  });

  it("does not own/want items if not logged in", async () => {
    const res = await query({
      query: gql`
        query {
          items(ids: ["38913", "39945", "39948"]) {
            id
            currentUserOwnsThis
            currentUserWantsThis
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "items": Array [
          Object {
            "currentUserOwnsThis": false,
            "currentUserWantsThis": false,
            "id": "38913",
          },
          Object {
            "currentUserOwnsThis": false,
            "currentUserWantsThis": false,
            "id": "39945",
          },
          Object {
            "currentUserOwnsThis": false,
            "currentUserWantsThis": false,
            "id": "39948",
          },
        ],
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`Array []`);
  });

  it("loads items that need models", async () => {
    jest.setTimeout(20000);

    const res = await query({
      query: gql`
        query {
          standardItems: itemsThatNeedModels {
            id
            name
            speciesThatNeedModels {
              id
              name
            }
          }

          babyItems: itemsThatNeedModels(colorId: "6") {
            id
            name
            speciesThatNeedModels(colorId: "6") {
              id
              name
            }
          }

          maraquanItems: itemsThatNeedModels(colorId: "44") {
            id
            name
            speciesThatNeedModels(colorId: "44") {
              id
              name
            }
          }

          mutantItems: itemsThatNeedModels(colorId: "46") {
            id
            name
            speciesThatNeedModels(colorId: "46") {
              id
              name
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchSnapshot();
    expect(getDbCalls()).toMatchSnapshot();
  });

  it("loads canonical appearance for single-species item", async () => {
    const res = await query({
      query: gql`
        query {
          item(
            id: "38911" # Zafara Agent Hood
          ) {
            canonicalAppearance {
              id
              layers {
                id
              }
              body {
                species {
                  name
                }
                canonicalAppearance {
                  id
                }
              }
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    const body = res.data.item.canonicalAppearance.body;
    expect(body.species.name).toEqual("Zafara");
    expect(res.data.item.canonicalAppearance.layers).toMatchSnapshot(
      "item layers"
    );
    expect(body.canonicalAppearance).toBeTruthy();
    expect(body.canonicalAppearance).toMatchSnapshot("pet layers");
    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("loads canonical appearance for all-species item", async () => {
    const res = await query({
      query: gql`
        query {
          item(
            id: "74967" # 17th Birthday Party Hat
          ) {
            canonicalAppearance {
              id
              layers {
                id
              }
              body {
                species {
                  name
                }
                canonicalAppearance {
                  id
                }
              }
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    const body = res.data.item.canonicalAppearance.body;
    expect(body.species.name).toEqual("Acara");
    expect(res.data.item.canonicalAppearance.layers).toMatchSnapshot(
      "item layers"
    );
    expect(body.canonicalAppearance).toBeTruthy();
    expect(body.canonicalAppearance).toMatchSnapshot("pet layers");
    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("loads canonical appearance for all-species Maraquan item", async () => {
    const res = await query({
      query: gql`
        query {
          item(
            id: "77530" # Maraquan Sea Blue Gown
          ) {
            canonicalAppearance {
              id
              layers {
                id
              }
              body {
                canonicalAppearance {
                  color {
                    name
                  }
                  species {
                    name
                  }
                  layers {
                    id
                  }
                }
              }
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    const body = res.data.item.canonicalAppearance.body;
    expect(res.data.item.canonicalAppearance).toBeTruthy();
    expect(res.data.item.canonicalAppearance.layers).toMatchSnapshot(
      "item layers"
    );
    expect(body.canonicalAppearance).toBeTruthy();
    expect(body.canonicalAppearance.species.name).toEqual("Acara");
    expect(body.canonicalAppearance.color.name).toEqual("Maraquan");
    expect(body.canonicalAppearance.layers).toMatchSnapshot("pet layers");
    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("loads canonical appearance for bodyId=0 item", async () => {
    const res = await query({
      query: gql`
        query {
          item(
            id: "37375" # Moon and Stars Background
          ) {
            canonicalAppearance {
              id
              layers {
                id
              }
              body {
                species {
                  name
                }
                canonicalAppearance {
                  id
                }
              }
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    const body = res.data.item.canonicalAppearance.body;
    expect(body.species.name).toEqual("Acara");
    expect(res.data.item.canonicalAppearance.layers).toMatchSnapshot(
      "item layers"
    );
    expect(body.canonicalAppearance).toBeTruthy();
    expect(body.canonicalAppearance).toMatchSnapshot("pet layers");
    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("adds new item to items current user owns", async () => {
    useTestDb();
    await Promise.all([logInAsTestUser(), createItem("1")]);

    // To start, the user should not own the item yet.
    let res = await query({
      query: gql`
        query {
          item(id: "1") {
            currentUserOwnsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserOwnsThis).toBe(false);

    // Mutate the item to mark that the user owns it, and check that the
    // immediate response reflects this.
    res = await mutate({
      mutation: gql`
        mutation {
          item: addToItemsCurrentUserOwns(itemId: "1") {
            currentUserOwnsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserOwnsThis).toBe(true);

    // Confirm that, when replaying the first query, we see that the user now
    // _does_ own the item.
    res = await query({
      query: gql`
        query {
          item(id: "1") {
            currentUserOwnsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserOwnsThis).toBe(true);

    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("does not add duplicates when user already owns item", async () => {
    useTestDb();
    await Promise.all([logInAsTestUser(), createItem("1")]);

    // Send the add mutation for the first time. This should add it to the
    // items we own.
    let res = await mutate({
      mutation: gql`
        mutation {
          item: addToItemsCurrentUserOwns(itemId: "1") {
            currentUserOwnsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserOwnsThis).toBe(true);

    // Send the add mutation for the second time. This should do nothing,
    // because we already own it.
    res = await mutate({
      mutation: gql`
        mutation {
          item: addToItemsCurrentUserOwns(itemId: "1") {
            currentUserOwnsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserOwnsThis).toBe(true);

    // Afterwards, confirm that it only appears once in the list of items we
    // own, instead of duplicating.
    res = await query({
      query: gql`
        query {
          currentUser {
            itemsTheyOwn {
              id
            }
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.currentUser.itemsTheyOwn).toEqual([{ id: "1" }]);

    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("adds new item to items current user wants", async () => {
    useTestDb();
    await Promise.all([logInAsTestUser(), createItem("1")]);

    // To start, the user should not want the item yet.
    let res = await query({
      query: gql`
        query {
          item(id: "1") {
            currentUserWantsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserWantsThis).toBe(false);

    // Mutate the item to mark that the user wants it, and check that the
    // immediate response reflects this.
    res = await mutate({
      mutation: gql`
        mutation {
          item: addToItemsCurrentUserWants(itemId: "1") {
            currentUserWantsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserWantsThis).toBe(true);

    // Confirm that, when replaying the first query, we see that the user now
    // _does_ want the item.
    res = await query({
      query: gql`
        query {
          item(id: "1") {
            currentUserWantsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserWantsThis).toBe(true);

    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("does not add duplicates when user already wants item", async () => {
    useTestDb();
    await Promise.all([logInAsTestUser(), createItem("1")]);

    // Send the add mutation for the first time. This should add it to the
    // items we want.
    let res = await mutate({
      mutation: gql`
        mutation {
          item: addToItemsCurrentUserWants(itemId: "1") {
            currentUserWantsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserWantsThis).toBe(true);

    // Send the add mutation for the second time. This should do nothing,
    // because we already want it.
    res = await mutate({
      mutation: gql`
        mutation {
          item: addToItemsCurrentUserWants(itemId: "1") {
            currentUserWantsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserWantsThis).toBe(true);

    // Afterwards, confirm that it only appears once in the list of items we
    // want, instead of duplicating.
    res = await query({
      query: gql`
        query {
          currentUser {
            itemsTheyWant {
              id
            }
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.currentUser.itemsTheyWant).toEqual([{ id: "1" }]);

    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("removes item from items user owns", async () => {
    useTestDb();
    await Promise.all([logInAsTestUser(), createItem("1")]);

    // First, add the item.
    let res = await mutate({
      mutation: gql`
        mutation {
          item: addToItemsCurrentUserOwns(itemId: "1") {
            currentUserOwnsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserOwnsThis).toBe(true);

    // Then, remove the item.
    res = await mutate({
      mutation: gql`
        mutation {
          item: removeFromItemsCurrentUserOwns(itemId: "1") {
            currentUserOwnsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserOwnsThis).toBe(false);

    // Finally, confirm the removal was persisted.
    res = await query({
      query: gql`
        query {
          item(id: "1") {
            currentUserOwnsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserOwnsThis).toBe(false);

    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("does nothing when removing an item we don't own", async () => {
    useTestDb();
    await Promise.all([logInAsTestUser(), createItem("1")]);

    let res = await mutate({
      mutation: gql`
        mutation {
          item: removeFromItemsCurrentUserOwns(itemId: "1") {
            currentUserOwnsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserOwnsThis).toBe(false);

    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("removes item from items user wants", async () => {
    useTestDb();
    await Promise.all([logInAsTestUser(), createItem("1")]);

    // First, add the item.
    let res = await mutate({
      mutation: gql`
        mutation {
          item: addToItemsCurrentUserWants(itemId: "1") {
            currentUserWantsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserWantsThis).toBe(true);

    // Then, remove the item.
    res = await mutate({
      mutation: gql`
        mutation {
          item: removeFromItemsCurrentUserWants(itemId: "1") {
            currentUserWantsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserWantsThis).toBe(false);

    // Finally, confirm the removal was persisted.
    res = await query({
      query: gql`
        query {
          item(id: "1") {
            currentUserWantsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserWantsThis).toBe(false);

    expect(getDbCalls()).toMatchSnapshot("db");
  });

  it("does nothing when removing an item we don't want", async () => {
    useTestDb();
    await Promise.all([logInAsTestUser(), createItem("1")]);

    let res = await mutate({
      mutation: gql`
        mutation {
          item: removeFromItemsCurrentUserWants(itemId: "1") {
            currentUserWantsThis
          }
        }
      `,
    });
    expect(res).toHaveNoErrors();
    expect(res.data.item.currentUserWantsThis).toBe(false);

    expect(getDbCalls()).toMatchSnapshot("db");
  });
});
