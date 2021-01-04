const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});

const { renderOutfitImage } = require("../src/server/outfit-images");

async function handle(req, res) {
  const image = await renderOutfitImage();
  return res.status(200).setHeader("Content-Type", "image/png").send(image);
}

export default async (req, res) => {
  beeline.withTrace({ name: "outfitImage" }, () => handle(req, res));
};
