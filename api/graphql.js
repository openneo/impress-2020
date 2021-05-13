const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});

const { ApolloServer } = require("../src/server/lib/apollo-server-vercel");
const { config } = require("../src/server");

const server = new ApolloServer(config);
const serverHandler = server.createHandler();

async function handle(req, res) {
  await serverHandler(req, res);

  // As a sneaky trick, we require the Honeycomb trace to finish before the
  // request formally finishes. This... is technically a slowdown, I'm not sure
  // how much of one. Hopefully not too much?
  // https://vercel.com/docs/platform/limits#streaming-responses
  await beeline.flush();
  res.end();
}

export default handle;
