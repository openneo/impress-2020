const gql = require("graphql-tag");
const { query, getDbCalls } = require("./setup.js");

describe("User", () => {
  it("looks up a user", async () => {
    const res = await query({
      query: gql`
        query {
          user(id: "6") {
            id
            username
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "user": Object {
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
    expect(res.data.user).toBe(null);
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
});
