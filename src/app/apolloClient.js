import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { createPersistedQueryLink } from "apollo-link-persisted-queries";
import gql from "graphql-tag";

import cachedZones from "./cached-data/zones.json";

// Teach Apollo to load certain fields from the cache, to avoid extra network
// requests. This happens a lot - e.g. reusing data from item search on the
// outfit immediately!
const typePolicies = {
  Query: {
    fields: {
      allZones: (_, { toReference }) => {
        return cachedZones.map((z) =>
          toReference({ __typename: "Zone", id: z.id }, true)
        );
      },
      items: (_, { args, toReference }) => {
        return args.ids.map((id) =>
          toReference({ __typename: "Item", id }, true)
        );
      },
      item: (_, { args, toReference }) => {
        return toReference({ __typename: "Item", id: args.id }, true);
      },
      petAppearanceById: (_, { args, toReference }) => {
        return toReference({ __typename: "PetAppearance", id: args.id }, true);
      },
      species: (_, { args, toReference }) => {
        return toReference({ __typename: "Species", id: args.id }, true);
      },
      color: (_, { args, toReference }) => {
        return toReference({ __typename: "Color", id: args.id }, true);
      },
    },
  },

  Item: {
    fields: {
      appearanceOn: (appearance, { args, readField, toReference }) => {
        // If we already have this exact appearance in the cache, serve it!
        if (appearance) {
          return appearance;
        }

        // Otherwise, we're going to see if this is a standard color, in which
        // case we can reuse the standard color appearance if we already have
        // it! This helps for fast loading when switching between standard
        // colors.

        const { speciesId, colorId } = args;

        // HACK: I can't find a way to do bigger-picture queries like this from
        //       Apollo's cache field reader API. Am I missing something? I
        //       don't love escape-hatching to the client like this, but...
        let cachedData;
        try {
          cachedData = hackyEscapeHatchClient.readQuery({
            query: gql`
              query CacheLookupForItemAppearanceReader(
                $speciesId: ID!
                $colorId: ID!
              ) {
                species(id: $speciesId) {
                  standardBodyId
                }
                color(id: $colorId) {
                  isStandard
                }
              }
            `,
            variables: { speciesId, colorId },
          });
        } catch (e) {
          // Some errors are expected while setting up the cache... not sure
          // how to distinguish from Real errors. Just gonna ignore them all
          // for now!
          return undefined;
        }

        if (!cachedData) {
          // This is an expected case while the page is loading.
          return undefined;
        }

        const { species, color } = cachedData;
        if (color.isStandard) {
          const itemId = readField("id");
          const bodyId = species.standardBodyId;
          return toReference({
            __typename: "ItemAppearance",
            id: `item-${itemId}-body-${bodyId}`,
          });
        } else {
          return undefined;
        }
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
const buildAuthLink = (getAuth0) =>
  setContext(async (_, { headers }) => {
    // Wait for auth0 to stop loading, so we can maybe get a token! We'll do
    // this hackily by checking every 100ms until it's true.
    await new Promise((resolve) => {
      function check() {
        if (getAuth0().isLoading) {
          setTimeout(check, 100);
        } else {
          resolve();
        }
      }
      check();
    });

    const { isAuthenticated, getAccessTokenSilently } = getAuth0();
    if (isAuthenticated) {
      const token = await getAccessTokenSilently();
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : "",
        },
      };
    }
  });

const initialCache = {};
for (const zone of cachedZones) {
  initialCache[`Zone:${zone.id}`] = { __typename: "Zone", ...zone };
}

/**
 * apolloClient is the global Apollo Client instance we use for GraphQL
 * queries. This is how we communicate with the server!
 */
let hackyEscapeHatchClient = null;
const buildClient = (getAuth0) => {
  const client = new ApolloClient({
    link: buildAuthLink(getAuth0).concat(persistedQueryLink).concat(httpLink),
    cache: new InMemoryCache({ typePolicies }).restore(initialCache),
    connectToDevTools: true,
  });

  hackyEscapeHatchClient = client;

  return client;
};

export default buildClient;
