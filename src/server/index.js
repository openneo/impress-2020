const util = require("util");

const { addBeelineToSchema, beelinePlugin } = require("./lib/beeline-graphql");
const { gql, makeExecutableSchema } = require("apollo-server");
const jwtVerify = util.promisify(require("jsonwebtoken").verify);
const jwksClient = require("jwks-rsa");

const connectToDb = require("./db");
const buildLoaders = require("./loaders");
const { svgLoggingPlugin } = require("./types/AppearanceLayer");

const rootTypeDefs = gql`
  directive @cacheControl(maxAge: Int!) on FIELD_DEFINITION | OBJECT

  type Mutation
  type Query
`;

function mergeTypeDefsAndResolvers(modules) {
  const allTypeDefs = [];
  const allResolvers = {};

  for (const { typeDefs, resolvers } of modules) {
    allTypeDefs.push(typeDefs);
    for (const typeName of Object.keys(resolvers)) {
      allResolvers[typeName] = {
        ...allResolvers[typeName],
        ...resolvers[typeName],
      };
    }
  }

  return { typeDefs: allTypeDefs, resolvers: allResolvers };
}

const schema = makeExecutableSchema(
  mergeTypeDefsAndResolvers([
    { typeDefs: rootTypeDefs, resolvers: {} },
    require("./types/AppearanceLayer"),
    require("./types/Item"),
    require("./types/MutationsForSupport"),
    require("./types/Outfit"),
    require("./types/PetAppearance"),
    require("./types/User"),
    require("./types/Zone"),
  ])
);

const plugins = [svgLoggingPlugin];

if (process.env["NODE_ENV"] !== "test") {
  addBeelineToSchema(schema);
  plugins.push(beelinePlugin);
}

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

const config = {
  schema,
  context: async ({ req }) => {
    const db = await connectToDb();

    const svgLogger = svgLoggingPlugin.buildSvgLogger();

    const auth = (req && req.headers && req.headers.authorization) || "";
    const authMatch = auth.match(/^Bearer (.+)$/);
    const token = authMatch && authMatch[1];
    const currentUserId = await getUserIdFromToken(token);

    return {
      db,
      svgLogger,
      currentUserId,
      ...buildLoaders(db),
    };
  },

  plugins,

  // Enable Playground in production :)
  introspection: true,
  playground: {
    endpoint: "/api/graphql",
  },
};

if (require.main === module) {
  const { ApolloServer } = require("apollo-server");
  const server = new ApolloServer(config);
  server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

module.exports = { config };
