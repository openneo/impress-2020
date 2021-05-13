const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});
const AWS = require("aws-sdk");
const Jimp = require("jimp");

const connectToDb = require("../src/server/db");
const buildLoaders = require("../src/server/loaders");
const {
  loadBodyName,
  logToDiscord,
  normalizeRow,
} = require("../src/server/util");

if (
  !process.env["DTI_AWS_ACCESS_KEY_ID"] ||
  !process.env["DTI_AWS_SECRET_ACCESS_KEY"]
) {
  throw new Error(
    `must provide DTI_AWS_ACCESS_KEY_ID and DTI_AWS_SECRET_ACCESS_KEY ` +
      `environment variables`
  );
}

const s3 = new AWS.S3({
  accessKeyId: process.env["DTI_AWS_ACCESS_KEY_ID"],
  secretAccessKey: process.env["DTI_AWS_SECRET_ACCESS_KEY"],
});

async function upload(bucket, key, imageData) {
  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: imageData,
      ContentType: "image/png",
      ACL: "public-read",
    })
    .promise();
}

async function resize(imageData, size) {
  const image = await Jimp.read(imageData);
  const resizedImage = image.resize(size, size);
  const resizedImageData = await resizedImage.getBufferAsync("image/png");
  return resizedImageData;
}

async function processImage(assetType, remoteId, size, imageData) {
  if (size !== 600) {
    imageData = await resize(imageData, size);
  }

  const paddedId = String(remoteId).padStart(12, "0");
  const id1 = paddedId.slice(0, 3);
  const id2 = paddedId.slice(3, 6);
  const id3 = paddedId.slice(6, 9);
  const key = `${assetType}/${id1}/${id2}/${id3}/${remoteId}/${size}x${size}.png`;

  await upload("impress-asset-images", key, imageData);
  console.info(`Successfully uploaded ${key} to impress-asset-images`);
}

async function handle(req, res) {
  if (req.headers["dti-support-secret"] !== process.env["SUPPORT_SECRET"]) {
    res.status(401).send(`Support secret is incorrect. Try setting up again?`);
    return;
  }

  let imageData = Buffer.alloc(0);
  await new Promise((resolve) => {
    req.on("data", (chunk) => {
      imageData = Buffer.concat([imageData, chunk]);
    });
    req.on("end", () => {
      resolve();
    });
  });

  const db = await connectToDb();

  const { layerId } = req.query;
  const [layerRows] = await db.execute(
    `SELECT * FROM swf_assets WHERE id = ?`,
    [layerId]
  );
  const layer = normalizeRow(layerRows[0]);
  if (!layer) {
    res.status(404).send(`Layer not found`);
  }

  const { remoteId, type: assetType } = layer;
  await Promise.all([
    processImage(assetType, remoteId, 600, imageData),
    processImage(assetType, remoteId, 300, imageData),
    processImage(assetType, remoteId, 150, imageData),
  ]);

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const [result] = await db.execute(
    `UPDATE swf_assets SET image_manual = 1, converted_at = ?
     WHERE type = ? AND remote_id = ? LIMIT 1`,
    [now, assetType, remoteId]
  );
  if (result.affectedRows !== 1) {
    res
      .status(500)
      .send(`expected 1 affected row but found ${result.affectedRows}`);
  }

  if (process.env["SUPPORT_TOOLS_DISCORD_WEBHOOK_URL"]) {
    try {
      const {
        itemLoader,
        itemTranslationLoader,
        zoneTranslationLoader,
      } = buildLoaders(db);

      // Copied from setLayerBodyId mutation
      const itemId = await db
        .execute(
          `SELECT parent_id FROM parents_swf_assets
          WHERE swf_asset_id = ? AND parent_type = "Item" LIMIT 1;`,
          [layerId]
        )
        .then(([rows]) => normalizeRow(rows[0]).parentId);

      const [
        item,
        itemTranslation,
        zoneTranslation,
        bodyName,
      ] = await Promise.all([
        itemLoader.load(itemId),
        itemTranslationLoader.load(itemId),
        zoneTranslationLoader.load(layer.zoneId),
        loadBodyName(layer.bodyId, db),
      ]);

      await logToDiscord({
        embeds: [
          {
            title: `🛠 ${itemTranslation.name}`,
            thumbnail: {
              url: item.thumbnailUrl,
              height: 80,
              width: 80,
            },
            fields: [
              {
                name: `Layer ${layerId} (${zoneTranslation.label})`,
                value: `🎨 Uploaded new PNG for ${bodyName}`,
              },
            ],
            timestamp: new Date().toISOString(),
            url: `https://impress.openneo.net/items/${itemId}`,
          },
        ],
      });
    } catch (e) {
      console.error("Error sending Discord support log", e);
    }
  }

  res.status(200).send();
}

async function handleWithBeeline(req, res) {
  beeline.withTrace(
    { name: "api/uploadLayerImage", operation_name: "api/uploadLayerImage" },
    () => handle(req, res)
  );
}

export default handleWithBeeline;
