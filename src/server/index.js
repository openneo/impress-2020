import { beelinePlugin } from "./lib/beeline-graphql";
import { gql, makeExecutableSchema } from "apollo-server";
import { getUserIdFromToken } from "./auth";
import connectToDb from "./db";
import buildLoaders from "./loaders";
import { plugin as cacheControlPluginFork } from "./lib/apollo-cache-control-fork";

const rootTypeDefs = gql`
  enum CacheScope {
    PUBLIC
    PRIVATE
  }
  directive @cacheControl(
    maxAge: Int
    staleWhileRevalidate: Int
    scope: CacheScope
  ) on FIELD_DEFINITION | OBJECT

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
    require("./types/ClosetList"),
    require("./types/Item"),
    require("./types/MutationsForSupport"),
    require("./types/Outfit"),
    require("./types/Pet"),
    require("./types/PetAppearance"),
    require("./types/User"),
    require("./types/Zone"),
  ])
);

const plugins = [cacheControlPluginFork({ calculateHttpHeaders: true })];

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
  formatResponse: (res, context) => {
    // The Authorization header can affect the response, so we signal that here
    // for caching user data! That way, login/logout will refresh user data,
    // even if it was briefly cached.
    //
    // NOTE: Our frontend JS only sends the Authorization header for user data
    //       queries. For public data, the header will be absent, and different
    //       users will still be able to share the same public cache data.
    //
    // NOTE: At time of writing, I'm not sure we use this in app? I think all
    //       current user data queries request fields with `maxAge: 0`. But I'm
    //       adding it just to remove a potential surprise gotcha later!
    context.response.http.headers.set("Vary", "Authorization");

    return res;
  },

  plugins,

  // We use our own fork of the cacheControl plugin!
  cacheControl: false,

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
    console.info(`🚀  Server ready at ${url}`);
  });
}

module.exports = { config };
