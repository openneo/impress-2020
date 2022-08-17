import { beelinePlugin } from "./lib/beeline-graphql";
import { gql, makeExecutableSchema } from "apollo-server";
import { getUserIdFromToken as getUserIdFromTokenViaAuth0 } from "./auth";
import connectToDb from "./db";
import buildLoaders from "./loaders";
import { plugin as cacheControlPluginFork } from "./lib/apollo-cache-control-fork";
import {
  getAuthToken,
  getUserIdFromToken as getUserIdFromTokenViaDb,
} from "./auth-by-db";

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
  context: async ({ req, res }) => {
    const db = await connectToDb();

    let authMode = req?.headers?.["dti-auth-mode"] || "auth0";
    let currentUserId;
    if (authMode === "auth0") {
      const auth = req?.headers?.authorization || "";
      const authMatch = auth.match(/^Bearer (.+)$/);
      const token = authMatch && authMatch[1];
      currentUserId = await getUserIdFromTokenViaAuth0(token);
    } else if (authMode === "db") {
      currentUserId = await getCurrentUserIdViaDb(req);
    } else {
      console.warn(
        `Unexpected auth mode: ${JSON.stringify(authMode)}. Skipping auth.`
      );
      currentUserId = null;
    }

    return {
      db,
      currentUserId,
      login: async (params) => {
        const authToken = await getAuthToken(params, db);
        if (authToken == null) {
          return null;
        }
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        res.setHeader(
          "Set-Cookie",
          `DTIAuthToken=${encodeURIComponent(JSON.stringify(authToken))}; ` +
            `Max-Age=${60 * 60 * 24 * 7}; Secure; HttpOnly; SameSite=Strict`
        );
        return authToken;
      },
      logout: async () => {
        // NOTE: This function isn't actually async in practice, but we mark it
        //       as such for consistency with `login`!
        // Set a header to delete the cookie. (That is, empty and expired.)
        res.setHeader("Set-Cookie", `DTIAuthToken=; Max-Age=-1`);
      },
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

async function getCurrentUserIdViaDb(req) {
  const authTokenCookieString = req.cookies.DTIAuthToken;
  if (!authTokenCookieString) {
    return null;
  }

  let authTokenFromCookie = null;
  try {
    authTokenFromCookie = JSON.parse(authTokenCookieString);
  } catch (error) {
    console.warn(`DTIAuthToken cookie was not valid JSON, ignoring.`);
  }

  return await getUserIdFromTokenViaDb(authTokenFromCookie);
}

if (require.main === module) {
  const { ApolloServer } = require("apollo-server");
  const server = new ApolloServer(config);
  server.listen().then(({ url }) => {
    console.info(`🚀  Server ready at ${url}`);
  });
}

module.exports = { config };
