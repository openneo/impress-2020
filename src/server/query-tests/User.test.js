const gql = require("graphql-tag");
const { query, getDbCalls, logInAsTestUser } = require("./setup.js");

describe("User", () => {
  it("looks up a user", async () => {
    // TODO: I'm not sure why this is taking extra time, maybe the db conn?
    jest.setTimeout(20000);

    const res = await query({
      query: gql`
        query {
          user(id: "6") {
            id
            username
            contactNeopetsUsername
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "user": Object {
          "contactNeopetsUsername": "matchu1993",
          "id": "6",
          "username": "matchu",
        },
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM users WHERE id IN (?)",
          Array [
            "6",
          ],
        ],
        Array [
          "SELECT * FROM neopets_connections WHERE id IN (?)",
          Array [
            "1",
          ],
        ],
      ]
    `);
  });

  it("returns null when user not found", async () => {
    const res = await query({
      query: gql`
        query {
          user(id: "<invalid-user-id>") {
            id
            username
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toEqual({ user: null });
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM users WHERE id IN (?)",
          Array [
            "<invalid-user-id>",
          ],
        ],
      ]
    `);
  });

  it("gets current user, if logged in", async () => {
    await logInAsTestUser();

    const res = await query({
      query: gql`
        query {
          currentUser {
            id
            username
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "currentUser": Object {
          "id": "44743",
          "username": "dti-test",
        },
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM users WHERE id IN (?)",
          Array [
            "44743",
          ],
        ],
      ]
    `);
  });

  it("gets no user, if logged out", async () => {
    const res = await query({
      query: gql`
        query {
          currentUser {
            id
            username
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toEqual({ currentUser: null });
    expect(getDbCalls()).toMatchInlineSnapshot(`Array []`);
  });

  it("gets private items they own for current user", async () => {
    await logInAsTestUser();

    const res = await query({
      query: gql`
        query {
          user(id: "44743") {
            id
            username
            itemsTheyOwn {
              id
              name
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "user": Object {
          "id": "44743",
          "itemsTheyOwn": Array [
            Object {
              "id": "74967",
              "name": "17th Birthday Party Hat",
            },
            Object {
              "id": "49026",
              "name": "Abominable Snowman Hat",
            },
            Object {
              "id": "39948",
              "name": "Altador Cup Background - Lost Desert",
            },
            Object {
              "id": "39955",
              "name": "Altador Cup Background - Virtupets",
            },
            Object {
              "id": "40319",
              "name": "Blue Jelly Tiara",
            },
          ],
          "username": "dti-test",
        },
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM users WHERE id IN (?)",
          Array [
            "44743",
          ],
        ],
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
        Array [
          "SELECT * FROM closet_lists
             WHERE user_id IN (?)
             ORDER BY name",
          Array [
            "44743",
          ],
        ],
      ]
    `);
  });

  it("hides private items they own from other users", async () => {
    const res = await query({
      query: gql`
        query {
          user(id: "44743") {
            id
            username
            itemsTheyOwn {
              id
              name
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "user": Object {
          "id": "44743",
          "itemsTheyOwn": Array [
            Object {
              "id": "39955",
              "name": "Altador Cup Background - Virtupets",
            },
          ],
          "username": "dti-test",
        },
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM users WHERE id IN (?)",
          Array [
            "44743",
          ],
        ],
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
        Array [
          "SELECT * FROM closet_lists
             WHERE user_id IN (?)
             ORDER BY name",
          Array [
            "44743",
          ],
        ],
      ]
    `);
  });

  it("gets private items they want for current user", async () => {
    await logInAsTestUser();

    const res = await query({
      query: gql`
        query {
          user(id: "44743") {
            id
            username
            itemsTheyWant {
              id
              name
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "user": Object {
          "id": "44743",
          "itemsTheyWant": Array [
            Object {
              "id": "39945",
              "name": "Altador Cup Background - Haunted Woods",
            },
            Object {
              "id": "39956",
              "name": "Altador Cup Background - Kreludor",
            },
            Object {
              "id": "39947",
              "name": "Altador Cup Background - Shenkuu",
            },
          ],
          "username": "dti-test",
        },
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM users WHERE id IN (?)",
          Array [
            "44743",
          ],
        ],
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
        Array [
          "SELECT * FROM closet_lists
             WHERE user_id IN (?)
             ORDER BY name",
          Array [
            "44743",
          ],
        ],
      ]
    `);
  });

  it("hides private items they want from other users", async () => {
    const res = await query({
      query: gql`
        query {
          user(id: "44743") {
            id
            username
            itemsTheyWant {
              id
              name
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "user": Object {
          "id": "44743",
          "itemsTheyWant": Array [
            Object {
              "id": "39947",
              "name": "Altador Cup Background - Shenkuu",
            },
          ],
          "username": "dti-test",
        },
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM users WHERE id IN (?)",
          Array [
            "44743",
          ],
        ],
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
        Array [
          "SELECT * FROM closet_lists
             WHERE user_id IN (?)
             ORDER BY name",
          Array [
            "44743",
          ],
        ],
      ]
    `);
  });
});
