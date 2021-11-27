const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});

async function handle(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf8");
  res
    .status(410)
    .send(
      "WakaGuide.com is no longer updating its values, so we no longer " +
        "serve them from this endpoint. The most recent set of values is " +
        "archived here: https://docs.google.com/spreadsheets/d/1DRMrniTSZP0sgZK6OAFFYqpmbT6xY_Ve_i480zghOX0"
    );
}

async function handleWithBeeline(req, res) {
  beeline.withTrace(
    { name: "api/allWakaValues", operation_name: "api/allWakaValues" },
    () => handle(req, res)
  );
}

export default handleWithBeeline;
