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
            }
            color {
              id
            }
            pose
            items {
              id
            }
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchSnapshot();
    expect(getDbCalls()).toMatchInlineSnapshot(`Array []`);
  });
});
