// We run this on build to cache some stable database tables into the JS
// bundle!
require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-build-process",
});
const fs = require("fs").promises;
const path = require("path");

const { ApolloServer } = require("apollo-server");
const { createTestClient } = require("apollo-server-testing");
const gql = require("graphql-tag");

const { config } = require("../src/server");

const cachedDataPath = path.join(__dirname, "..", "src", "app", "cached-data");

async function main() {
  await fs.mkdir(cachedDataPath, { recursive: true });

  // Check out this scrappy way of making a query against server code ^_^`
  const { query } = createTestClient(new ApolloServer(config));
  const res = await query({
    query: gql`
      query BuildCachedData {
        allZones {
          id
          label
          depth
          isCommonlyUsedByItems
        }
      }
    `,
  });
  if (res.errors) {
    for (const error of res.errors) {
      console.error(error);
    }
    throw new Error(`GraphQL request failed`);
  }

  const filePath = path.join(cachedDataPath, "zones.json");
  await fs.writeFile(
    filePath,
    JSON.stringify(res.data.allZones, null, 4),
    "utf8"
  );

  console.info(`📚 Wrote zones to ${path.relative(process.cwd(), filePath)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit());
