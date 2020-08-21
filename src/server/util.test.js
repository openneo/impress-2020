const gql = require("graphql-tag");
const { getDbCalls } = require("./query-tests/setup.js");

const connectToDb = require("./db");
const { loadBodyName } = require("./util");

describe("loadBodyName", () => {
  it("returns placeholder string for 0", async () => {
    const bodyName = await loadBodyName("0");
    expect(bodyName).toEqual("All bodies");
    expect(getDbCalls()).toEqual([]);
  });

  it("loads body name for all body IDs", async () => {
    jest.setTimeout(60000);

    const db = await connectToDb();
    const [rows] = await db.query(
      `SELECT DISTINCT body_id FROM pet_types ORDER BY body_id ASC`
    );
    const bodyIds = rows.map((r) => String(r["body_id"]));

    const bodyNames = await Promise.all(
      bodyIds.map((bodyId) => loadBodyName(bodyId, db).then((n) => [bodyId, n]))
    );

    expect(bodyNames).toMatchSnapshot();
  });
});
