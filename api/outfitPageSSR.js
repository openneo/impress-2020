/**
 * /api/outfitPageSSR also serves the initial request for /outfits/:id, to
 * add title and meta tags. This primarily for sharing, like on Discord or
 * Twitter or Facebook!
 *
 * The route is configured in vercel.json, at the project root.
 *
 * TODO: We could add the basic outfit page layout and image preview, to use
 *       SSR to decrease time-to-first-content for the end-user, too…
 */
const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});

import escapeHtml from "escape-html";
import fetch from "node-fetch";
import { promises as fs } from "fs";

import connectToDb from "../src/server/db";
import { normalizeRow } from "../src/server/util";

async function handle(req, res) {
  // Load index.html as our initial page content. If this fails, it probably
  // means something is misconfigured in a big way; we don't have a great way
  // to recover, and we'll just show an error message.
  let initialHtml;
  try {
    initialHtml = await loadIndexPageHtml();
  } catch (e) {
    console.error("Error loading index.html:", e);
    return reject(res, "Sorry, there was an error loading this outfit page!");
  }

  // Load the given outfit by ID. If this fails, it's possible that it's just a
  // problem with the SSR, and the client will be able to handle it better
  // anyway, so just show the standard index.html and let the app load
  // normally, as if there was no error. (We'll just log it.)
  let outfit;
  try {
    outfit = await loadOutfitData(req.query.id);
  } catch (e) {
    console.error("Error loading outfit data:", e);
    return sendHtml(res, initialHtml, 200);
  }

  // Similarly, if the outfit isn't found, we just show index.html - but with a
  // 404 and a gentler log message.
  if (outfit == null) {
    console.info(`Outfit not found: ${req.query.id}`);
    return sendHtml(res, initialHtml, 404);
  }

  // Okay, now let's rewrite the HTML to include some outfit data!
  //
  // WARNING!!!
  //     Be sure to always use `escapeHtml` when inserting user data!!
  // WARNING!!!
  //
  let html = initialHtml;

  // Add the outfit name to the title.
  html = html.replace(
    /<title>(.*)<\/title>/,
    `<title>${escapeHtml(outfit.name)} | Dress to Impress</title>`
  );

  // Add sharing meta tags just before the </head> tag.
  const updatedAtTimestamp = Math.floor(
    new Date(outfit.updatedAt).getTime() / 1000
  );
  const outfitUrl = `https://impress-2020.openneo.net/outfits/${encodeURIComponent(
    outfit.id
  )}`;
  const imageUrl = `https://impress-2020.openneo.net/api/outfitImage?size=600&id=${encodeURIComponent(
    outfit.id
  )}&updatedAt=${updatedAtTimestamp}`;
  const metaTags = `
    <meta property="og:title" content="${escapeHtml(outfit.name)}">
    <meta property="og:type" content="website">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:url" content="${escapeHtml(outfitUrl)}">
    <meta property="og:site_name" content="Dress to Impress">
    <meta property="og:description" content="A custom Neopets outfit, designed on Dress to Impress!">
  `;
  html = html.replace(/<\/head>/, `${metaTags}</head>`);

  console.info(`Successfully SSR'd outfit ${outfit.id}`);

  return sendHtml(res, html);
}

async function loadOutfitData(id) {
  const db = await connectToDb();
  const [rows] = await db.query(`SELECT * FROM outfits WHERE id = ?;`, [id]);
  if (rows.length === 0) {
    return null;
  }

  return normalizeRow(rows[0]);
}

let cachedIndexPageHtml = null;
async function loadIndexPageHtml() {
  if (cachedIndexPageHtml == null) {
    if (process.env.NODE_ENV === "development") {
      const htmlFromDevServer = await fetch(
        "http://localhost:3000/"
      ).then((res) => res.text());
      cachedIndexPageHtml = htmlFromDevServer;
    } else {
      const htmlFromFile = await fs.readFile("../build/index.html", "utf8");
      cachedIndexPageHtml = htmlFromFile;
    }
  }

  return cachedIndexPageHtml;
}

function reject(res, message, status = 400) {
  res.setHeader("Content-Type", "text/plain");
  return res.status(status).send(message);
}

function sendHtml(res, html, status = 200) {
  res.setHeader("Content-Type", "text/html");
  return res.status(status).send(html);
}

async function handleWithBeeline(req, res) {
  beeline.withTrace(
    { name: "api/outfitPageSSR", operation_name: "api/outfitPageSSR" },
    () => handle(req, res)
  );
}

export default handleWithBeeline;
