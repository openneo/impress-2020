const gql = require("graphql-tag");
const { query, getDbCalls, logInAsTestUser } = require("./setup.js");

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
});
