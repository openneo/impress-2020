import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { createPersistedQueryLink } from "apollo-link-persisted-queries";

const cachedZones = require("./cached-data/zones.json");
const cachedZonesById = new Map(cachedZones.map((z) => [z.id, z]));

const typePolicies = {
  Query: {
    fields: {
      // Teach Apollo how to serve `items` queries from the cache. That way,
      // when you remove an item from your outfit, or add an item from search,
      // Apollo knows it already has the data it needs and doesn't need to ask
      // the server again!
      items: (_, { args, toReference }) => {
        return args.ids.map((id) =>
          toReference({ __typename: "Item", id }, true)
        );
      },
    },
  },

  Zone: {
    fields: {
      depth: (depth, { readField }) => {
        const id = readField("id");
        return depth || cachedZonesById.get(id)?.depth || 0;
      },

      label: (label, { readField }) => {
        const id = readField("id");
        return label || cachedZonesById.get(id)?.label || `Zone #${id}`;
      },
    },
  },
};

// The PersistedQueryLink in front of the HttpLink helps us send cacheable GET
// requests.
const persistedQueryLink = createPersistedQueryLink({
  useGETForHashedQueries: true,
});
const httpLink = createHttpLink({ uri: "/api/graphql" });

/**
 * apolloClient is the global Apollo Client instance we use for GraphQL
 * queries. This is how we communicate with the server!
 */
export default new ApolloClient({
  link: persistedQueryLink.concat(httpLink),
  cache: new InMemoryCache({ typePolicies }),
  connectToDevTools: true,
});
