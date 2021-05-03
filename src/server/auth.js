import util from "util";

const jwtVerify = util.promisify(require("jsonwebtoken").verify);
import jwksClient from "jwks-rsa";

const jwks = jwksClient({
  jwksUri: "https://openneo.us.auth0.com/.well-known/jwks.json",
});

async function getJwtKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(null, signingKey);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

async function getUserIdFromToken(token) {
  // In development, you can start the server with
  // `IMPRESS_LOG_IN_AS=12345 vc dev` to simulate logging in as user 12345.
  //
  // This flag shouldn't be present in prod anyway, but the dev check is an
  // extra safety precaution!
  if (
    process.env["NODE_ENV"] === "development" &&
    process.env["IMPRESS_LOG_IN_AS"]
  ) {
    return process.env["IMPRESS_LOG_IN_AS"];
  }

  if (!token) {
    return null;
  }

  let payload;
  try {
    payload = await jwtVerify(token, getJwtKey, {
      audience: "https://impress-2020.openneo.net/api",
      issuer: "https://openneo.us.auth0.com/",
      algorithms: ["RS256"],
    });
  } catch (e) {
    console.error(`Invalid auth token: ${token}`, e);
    return null;
  }

  const subMatch = payload.sub.match(/auth0\|impress-([0-9]+)/);
  if (!subMatch) {
    console.error("Unexpected auth token sub format", payload.sub);
    return null;
  }
  const userId = subMatch[1];
  return userId;
}

module.exports = { getUserIdFromToken };
