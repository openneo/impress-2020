const ALLOWED_CORS_ORIGINS = [
  "https://beta.impress.openneo.net",
  "https://impress.openneo.net",
  "http://localhost:3000",
];

export function applyCORSHeaders(req, res) {
  const origin = req.headers["origin"];
  if (ALLOWED_CORS_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
  }

  // Add "Origin" to the `Vary` header, so caches know that the incoming Origin
  // header can change the response (specifically, the CORS response headers).
  //
  // NOTE: In this app, I don't expect "Vary: *" to ever be set. But we try to
  // be robust about it, just in case! (Adding instead of overwriting *does*
  // matter for the GraphQL endpoint, which sets "Vary: Accept-Encoding".)
  const varyContent = res.getHeader("Vary");
  if (varyContent !== "*") {
    const varyValues = varyContent ? varyContent.split(/,\s*/) : [];
    varyValues.push("Origin");
    res.setHeader("Vary", varyValues.join(", "));
  }
}
