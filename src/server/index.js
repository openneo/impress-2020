const { beelinePlugin } = require("./lib/beeline-graphql");
const { gql, makeExecutableSchema } = require("apollo-server");

const { getUserIdFromToken } = require("./auth");
const connectToDb = require("./db");
const buildLoaders = require("./loaders");

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
    require("./types/Pet"),
    require("./types/PetAppearance"),
    require("./types/User"),
    require("./types/Zone"),
  ])
);

const plugins = [];

if (process.env["NODE_ENV"] !== "test") {
  plugins.push(beelinePlugin);
}

const config = {
  schema,
  context: async ({ req }) => {
    const db = await connectToDb();

    const auth = (req && req.headers && req.headers.authorization) || "";
    const authMatch = auth.match(/^Bearer (.+)$/);
    const token = authMatch && authMatch[1];
    const currentUserId = await getUserIdFromToken(token);

    return {
      db,
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
