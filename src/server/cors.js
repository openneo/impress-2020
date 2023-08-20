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
}
