const gql = require("graphql-tag");
const { query, getDbCalls, logInAsTestUser } = require("./setup.js");

describe("Item", () => {
  it("loads metadata", async () => {
    const res = await query({
      query: gql`
        query {
          items(ids: ["38913", "38911", "38912", "55788", "77530", "78104"]) {
            id
            name
            description
            thumbnailUrl
            rarityIndex
            isNc
            manualSpecialColor {
              id
              name
            }
            explicitlyBodySpecific
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchSnapshot();
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM item_translations WHERE item_id IN (?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "38913",
            "38911",
            "38912",
            "55788",
            "77530",
            "78104",
          ],
        ],
        Array [
          "SELECT * FROM items WHERE id IN (?,?,?,?,?,?)",
          Array [
            "38913",
            "38911",
            "38912",
            "55788",
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
      ]
    `);
  });

  it("loads appearance data", async () => {
    const res = await query({
      query: gql`
        query {
          items(ids: ["38912", "38911", "37375"]) {
            id
            name

            appearanceOn(speciesId: "54", colorId: "75") {
              layers {
                id
                remoteId
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
          "SELECT * FROM item_translations WHERE item_id IN (?,?,?) AND locale = \\"en\\"",
          Array [
            "38912",
            "38911",
            "37375",
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
             WHERE (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0)) OR (rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0))",
          Array [
            "38912",
            "180",
            "38911",
            "180",
            "37375",
            "180",
          ],
        ],
        Array [
          "SELECT * FROM items WHERE id IN (?,?,?)",
          Array [
            "38912",
            "38911",
            "37375",
          ],
        ],
        Array [
          "SELECT * FROM zones WHERE id IN (?,?,?)",
          Array [
            "26",
            "40",
            "3",
          ],
        ],
        Array [
          "SELECT * FROM zone_translations WHERE zone_id IN (?,?,?) AND locale = \\"en\\"",
          Array [
            "26",
            "40",
            "3",
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
});
