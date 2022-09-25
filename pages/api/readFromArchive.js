/**
 * /api/readFromArchive reads a file from our images.neopets.com archive.
 *
 * Parameters:
 *   - url: The original canonical URL of the image,
 *          e.g. "https://images.neopets.com/items/acbg_virtupets.gif".
 *
 * One might wonder, why have this proxy at all? Why not just use the storage
 * service's own lil HTTP server? My main reason is to have one more lil
 * gate to control access, if it turns out someone tries to burn our egress
 * costs and we need to shut them off! And just in general, I don't like
 * relying on "public ACL" default behavior, it's scary :p
 *
 * For *actual* sharing of the whole archive, we'd want to like, put a .zip
 * file somewhere for people to download, from a service optimized for large
 * downloads.
 *
 * We don't check the incoming request very closely, because like, anything in
 * the archive bucket *is* meant to be read, there aren't secrets in it. And
 * this endpoint doesn't have any dangerous permissions, just endpoints for the
 * bucket. So even if someone did something clever with a URL to trick us into
 * loading the "wrong" thing, I don't see what they'd even *want*, y'know?
 */
const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});
import * as path from "node:path";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

async function handle(req, res) {
  const { url } = req.query;

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    res.end(`Error parsing URL parameter: ${error.message}`);
    return;
  }

  // An archive key is like: "images.neopets.com/cp/data/1/2/3/atlas.png?v=123".
  // So basically, just the host, path, and query string; no protocol or hash.
  // (Most archive keys don't have a query string, but some do! And don't
  // worry, `parsedUrl.search` will just be empty if there's no query string.)
  const archiveKey = `${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}`;
  let archiveRes;
  try {
    archiveRes = await fetchFromArchive(archiveKey);
  } catch (error) {
    if (error.Code === "NoSuchKey") {
      res.status(404);
      res.end();
    }

    res.end(`Error loading file from archive: ${error.message}`);
    return;
  }

  // Set the Content-Type so the browser interprets it correctly, and also tell
  // it the filename via Content-Disposition in case the browser chooses to
  // download it immediately (like with SWFs) or if the user chooses to Save As
  // it later.
  const filename = path.basename(archiveKey.split("?")[0]);
  const contentType = inferContentType(filename);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `inline; filename=${filename}`);

  // Send a long-term cache header, like images.neopets.com does! We assume
  // that, if they change an asset, they'll change the query string to bust the
  // cache, and so we'll get to see that change in the updated archive too.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(archiveRes.Body);
}

async function fetchFromArchive(archiveKey) {
  const storage = new S3Client({
    region: process.env.ARCHIVE_STORAGE_REGION,
    endpoint: `https://${process.env.ARCHIVE_STORAGE_HOST}`,
    credentials: {
      accessKeyId: process.env.ARCHIVE_STORAGE_READ_ACCESS_KEY,
      secretAccessKey: process.env.ARCHIVE_STORAGE_READ_SECRET_KEY,
    },
  });

  const res = await storage.send(
    new GetObjectCommand({
      Bucket: process.env.ARCHIVE_STORAGE_BUCKET,
      Key: archiveKey,
    })
  );
  return res;
}

function inferContentType(filename) {
  // So, S3 objects *do* have a ContentType field, but our upload script
  // doesn't infer it correctly for the filenames that include query strings.
  // Rather than write our own uploader or something to fix the ContentType in
  // S3 after the fact (the latter of which wouldn't be unreasonable and might
  // be a better approach), we just take advantage of the fact that the archive
  // only *really* has a small handful of filetypes that we would need to serve
  // to DTI, and that serving as `application/octet-stream` isn't unreasonable
  // for other kinds of files we might have.
  const fileExtension = path.extname(filename);
  if (fileExtension === ".json") {
    return "application/json";
  } else if (fileExtension === ".js") {
    return "text/javascript";
  } else if (fileExtension === ".png") {
    return "image/png";
  } else if (fileExtension === ".gif") {
    return "image/gif";
  } else if (fileExtension === ".svg") {
    return "image/svg+xml";
  } else if (fileExtension === ".jpeg" || fileExtension === ".jpg") {
    return "image/jpeg";
  } else if (fileExtension === ".swf") {
    return "application/x-shockwave-flash";
  } else if (fileExtension === ".mp3") {
    return "audio/mpeg3";
  } else {
    return "application/octet-stream";
  }
}

async function handleWithBeeline(req, res) {
  beeline.withTrace(
    { name: "api/readFromArchive", operation_name: "api/readFromArchive" },
    () => handle(req, res)
  );
}

export default handleWithBeeline;
