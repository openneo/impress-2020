import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { createPersistedQueryLink } from "apollo-link-persisted-queries";
import gql from "graphql-tag";

const cachedZones = require("./cached-data/zones.json");
const cachedZonesById = new Map(cachedZones.map((z) => [z.id, z]));

// Teach Apollo to load certain fields from the cache, to avoid extra network
// requests. This happens a lot - e.g. reusing data from item search on the
// outfit immediately!
const typePolicies = {
  Query: {
    fields: {
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
          cachedData = client.readQuery({
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

      isCommonlyUsedByItems: (isCommonlyUsedByItems, { readField }) => {
        const id = readField("id");
        return (
          isCommonlyUsedByItems ||
          cachedZonesById.get(id)?.isCommonlyUsedByItems ||
          false
        );
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
const client = new ApolloClient({
  link: persistedQueryLink.concat(httpLink),
  cache: new InMemoryCache({ typePolicies }),
  connectToDevTools: true,
});

export default client;
