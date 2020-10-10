import util from "util";
import stream from "stream";
import fetch from "node-fetch";

const streamPipeline = util.promisify(stream.pipeline);

const VALID_URL_PATTERNS = [
  /^http:\/\/images\.neopets\.com\/items\/[a-zA-Z0-9_ -]+\.gif$/,
  /^http:\/\/images\.neopets\.com\/cp\/(bio|items)\/data\/[0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[a-f0-9_]+\/[a-zA-Z0-9_ \-\/]+\.(svg|png|js)(\?[0-9]*)?$/,
  /^http:\/\/images\.neopets\.com\/cp\/(bio|items)\/swf\/[0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[a-f0-9_]+\.swf$/,

  // This one isn't actually used Impress 2020 - we added a cheap hack to old
  // Impress to upgrade images to use the Impress 2020 asset proxy 😅
  /^http:\/\/pets\.neopets\.com\/cp\/[a-zA-Z90-9]+\/[0-9]+\/[0-9]+\.png$/,
];

export default async (req, res) => {
  const urlToProxy = req.query.url;
  if (!urlToProxy) {
    return res
      .status(400)
      .send("Bad request: Must provide `?url` in the query string");
  }

  if (!VALID_URL_PATTERNS.some((p) => urlToProxy.match(p))) {
    return res
      .status(400)
      .send("Bad request: URL did not match any valid patterns");
  }

  console.debug("[assetProxy] 💌 Sending: %s", urlToProxy);

  const proxyRes = await fetch(urlToProxy);
  console.debug(
    `[assetProxy] %s %s: %s`,
    proxyRes.ok ? "✅" : "🛑",
    `${proxyRes.status} ${proxyRes.statusText}`.padStart(7, " "),
    urlToProxy
  );

  res.status(proxyRes.status);

  res.setHeader("Content-Type", proxyRes.headers.get("Content-Type"));
  res.setHeader("Cache-Control", proxyRes.headers.get("Cache-Control"));
  res.setHeader("ETag", proxyRes.headers.get("ETag"));
  res.setHeader("Last-Modified", proxyRes.headers.get("Last-Modified"));

  if (!proxyRes.headers.get("Content-Encoding")) {
    // If the content is not encoded (I think their images generally aren't?),
    // stream the body directly, to speed things up a bit.
    res.setHeader("Content-Length", proxyRes.headers.get("Content-Length"));
    await streamPipeline(proxyRes.body, res);
  } else {
    // Otherwise, I don't immediately know how to stream encoded content, so,
    // let's just await the full body and send it the normal way.
    const buffer = await proxyRes.buffer();
    res.send(buffer);
  }
};
