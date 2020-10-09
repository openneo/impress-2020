const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});

async function handle(req, res) {
  res.status(500).send("TODO! This is a fake error case.");
}

export default async (req, res) => {
  beeline.withTrace({ name: "uploadLayerImage" }, () => handle(req, res));
};
