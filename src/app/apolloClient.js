import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { createPersistedQueryLink } from "apollo-link-persisted-queries";

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

      // Teach Apollo how to serve `petAppearance` queries from the cache. That
      // way, when you switch pet poses, Apollo knows it already has the
      // appearance data and doesn't need to ask the server again!
      petAppearance: (_, { args, toReference }) => {
        const { speciesId, colorId, pose } = args;
        const id = `${speciesId}-${colorId}-${pose}`;
        return toReference({ __typename: "PetAppearance", id }, true);
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
});
