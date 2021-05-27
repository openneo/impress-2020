const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
  samplerHook,
});

const { ApolloServer } = require("../src/server/lib/apollo-server-vercel");
const { config } = require("../src/server");
const crypto = require("crypto");

const server = new ApolloServer(config);
const serverHandler = server.createHandler();

// We apply different sampling rates for different GraphQL operations
// (according to the client-defined query name), depending on how much load
// we're getting on them. For most operations, we just save all the events, but
// especially heavy-load operations get a lower sampling rate!
const OPERATION_SAMPLE_RATES = {
  ApiOutfitImage: 10, // save 1 out of every 10, ignore the others
  SearchPanel: 5, // save 1 out of every 5, ignore the others
};
function samplerHook(data) {
  // Use the sample rate from the table above.
  // Defaults to 1 (all) for most operations.
  let sampleRate = OPERATION_SAMPLE_RATES[data["app.operation_name"]] || 1;

  // Use the `deterministicSampler` to decide whether this event should be
  // sampled. This might be a child event of a higher-level trace, and we want
  // to make sure that we always return all child events of traces we've
  // sampled, and no child events of traces we haven't. Deterministically
  // sampling by trace ID does this for us!
  //
  // This strategy is outlined in: https://docs.honeycomb.io/getting-data-in/javascript/beeline-nodejs/#sampling-events.
  const shouldSample = deterministicSampler(data["trace.trace_id"], sampleRate);

  return { shouldSample, sampleRate };
}
function deterministicSampler(traceId, sampleRate) {
  // Copied from https://docs.honeycomb.io/getting-data-in/javascript/beeline-nodejs/#sampling-events
  const MAX_UINT32 = Math.pow(2, 32) - 1;
  const sum = crypto.createHash("sha1").update(traceId).digest();
  const upperBound = (MAX_UINT32 / sampleRate) >>> 0;
  return sum.readUInt32BE(0) <= upperBound;
}

async function handle(req, res) {
  // CAREFUL! We here allow any website to use our GraphQL API, so our data can
  // be more useful to the public. Using the * wildcard means that, in modern
  // browsers, requests should be sent without credentials. Additionally, we
  // don't store credentials in cookies; the client is responsible for setting
  // an Authorization header. So, I don't think there's any CSRF danger here.
  // But, let's be careful and make sure this continues to be true!
  res.setHeader("Access-Control-Allow-Origin", "*");

  await serverHandler(req, res);

  // As a sneaky trick, we require the Honeycomb trace to finish before the
  // request formally finishes. This... is technically a slowdown, I'm not sure
  // how much of one. Hopefully not too much?
  // https://vercel.com/docs/platform/limits#streaming-responses
  await beeline.flush();
  res.end();
}

export default handle;
