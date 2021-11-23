import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { createPersistedQueryLink } from "apollo-link-persisted-queries";

import cachedZones from "./cached-data/zones.json";
import { readCypressLoginData } from "./components/useCurrentUser";

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
      closetList: (_, { args, toReference }) => {
        return toReference({ __typename: "ClosetList", id: args.id }, true);
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
      outfit: (_, { args, toReference }) => {
        return toReference({ __typename: "Outfit", id: args.id }, true);
      },
      user: (_, { args, toReference }) => {
        return toReference({ __typename: "User", id: args.id }, true);
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
        console.debug(
          "[appearanceOn] seeking cached appearance",
          speciesId,
          colorId,
          readField("id")
        );
        const speciesStandardBodyId = readField(
          "standardBodyId",
          toReference({ __typename: "Species", id: speciesId })
        );
        const colorIsStandard = readField(
          "isStandard",
          toReference({ __typename: "Color", id: colorId })
        );
        if (speciesStandardBodyId == null || colorIsStandard == null) {
          // We haven't loaded all the species/colors into cache yet. We might
          // be loading them, depending on the page? Either way, return
          // `undefined`, meaning we don't know how to serve this from cache.
          // This will cause us to start loading it from the server.
          console.debug("[appearanceOn] species/colors not loaded yet");
          return undefined;
        }

        if (colorIsStandard) {
          const itemId = readField("id");
          console.debug(
            "[appearanceOn] standard color, will read:",
            `item-${itemId}-body-${speciesStandardBodyId}`
          );
          return toReference({
            __typename: "ItemAppearance",
            id: `item-${itemId}-body-${speciesStandardBodyId}`,
          });
        } else {
          console.debug("[appearanceOn] non-standard color, failure");
          // This isn't a standard color, so we don't support special
          // cross-color caching for it. Return `undefined`, meaning we don't
          // know how to serve this from cache. This will cause us to start
          // loading it from the server.
          return undefined;
        }
      },

      currentUserOwnsThis: (cachedValue, { readField }) => {
        if (cachedValue != null) {
          return cachedValue;
        }

        // Do we know what items this user owns? If so, scan for this item.
        const currentUserRef = readField("currentUser", {
          __ref: "ROOT_QUERY",
        });
        if (!currentUserRef) {
          return undefined;
        }
        const thisItemId = readField("id");
        const itemsTheyOwn = readField("itemsTheyOwn", currentUserRef);
        if (!itemsTheyOwn) {
          return undefined;
        }

        const theyOwnThisItem = itemsTheyOwn.some(
          (itemRef) => readField("id", itemRef) === thisItemId
        );
        return theyOwnThisItem;
      },
      currentUserWantsThis: (cachedValue, { readField }) => {
        if (cachedValue != null) {
          return cachedValue;
        }

        // Do we know what items this user owns? If so, scan for this item.
        const currentUserRef = readField("currentUser", {
          __ref: "ROOT_QUERY",
        });
        if (!currentUserRef) {
          return undefined;
        }
        const thisItemId = readField("id");
        const itemsTheyWant = readField("itemsTheyWant", currentUserRef);
        if (!itemsTheyWant) {
          return undefined;
        }

        const theyWantThisItem = itemsTheyWant.some(
          (itemRef) => readField("id", itemRef) === thisItemId
        );
        return theyWantThisItem;
      },
    },
  },

  ClosetList: {
    fields: {
      // When loading the updated contents of a list, replace it entirely.
      items: { merge: false },
    },
  },
};

const httpLink = createHttpLink({ uri: "/api/graphql" });
const buildAuthLink = (getAuth0) =>
  setContext(async (_, { headers = {}, sendAuth = false }) => {
    if (!sendAuth) {
      return;
    }

    const token = await getAccessToken(getAuth0);
    if (token) {
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : "",
        },
      };
    }
  });

async function getAccessToken(getAuth0) {
  // Our Cypress tests store login data separately. Use it if available!
  const cypressToken = readCypressLoginData()?.encodedToken;
  if (cypressToken) {
    return cypressToken;
  }

  // Otherwise, wait for auth0 to stop loading, so we can maybe get a token!
  // We'll do this hackily by checking every 100ms until it's true.
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
    return token;
  }
}

const initialCache = {};
for (const zone of cachedZones) {
  initialCache[`Zone:${zone.id}`] = { __typename: "Zone", ...zone };
}

const buildLink = (getAuth0) =>
  buildAuthLink(getAuth0)
    .concat(
      createPersistedQueryLink({
        useGETForHashedQueries: true,
      })
    )
    .concat(httpLink);

/**
 * apolloClient is the global Apollo Client instance we use for GraphQL
 * queries. This is how we communicate with the server!
 */
const buildClient = (getAuth0) =>
  new ApolloClient({
    link: buildLink(getAuth0),
    cache: new InMemoryCache({ typePolicies }).restore(initialCache),
    connectToDevTools: true,
  });

export default buildClient;
