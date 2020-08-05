const AWS = require("aws-sdk");
const Jimp = require("jimp");

const connectToDb = require("../src/server/db.js");

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
  console.log(`Successfully uploaded ${key} to impress-asset-images`);
}

export default async (req, res) => {
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
  const layer = layerRows[0];
  if (!layer) {
    res.status(404).send(`Layer not found`);
  }

  const { remote_id: remoteId, type: assetType } = layer;
  const [imageUrl600, imageUrl300, imageUrl150] = await Promise.all([
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

  res.status(200).send({ imageUrl600, imageUrl300, imageUrl150 });
};
