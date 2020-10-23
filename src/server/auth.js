const util = require("util");

const jwtVerify = util.promisify(require("jsonwebtoken").verify);
const jwksClient = require("jwks-rsa");

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
    console.error(`Invalid auth token: ${token}\n${e}`);
    return null;
  }

  const subMatch = payload.sub.match(/auth0\|impress-([0-9]+)/);
  if (!subMatch) {
    console.log("Unexpected auth token sub format", payload.sub);
    return null;
  }
  const userId = subMatch[1];
  return userId;
}

module.exports = { getUserIdFromToken };
