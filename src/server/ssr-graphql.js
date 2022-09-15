const { InMemoryCache } = require("@apollo/client");
const { ApolloServer, gql } = require("apollo-server");
const { config } = require("./index");

const server = new ApolloServer(config);

async function loadGraphqlQuery({ query, variables = {} }) {
  // Edit the query to serve our needs, then send a local in-memory request to
  // a simple `ApolloServer` instance just for SSR.
  const convertedQuery = addTypenameToSelections(removeClientOnlyFields(query));
  const { data, errors } = await server.executeOperation({
    query: convertedQuery,
    variables,
  });

  // To get the cache data, we build a new temporary cache object, write this
  // query result to it, and dump it out. (Building a normalized cache state is
  // really tricky, this simplifies it a lot without bringing in the weight of
  // a whole client!)
  const cache = new InMemoryCache();
  cache.writeQuery({ query, variables, data });
  const state = cache.extract();

  // We return the data, errors, and cache state: we figure callers will almost
  // always want the errors and state, and may also want the data!
  return { data, errors, state };
}

/**
 * addTypenameToSelections recursively adds __typename to every selection set
 * in the query, and returns a copy. This enables us to use the query data to
 * populate a cache!
 */
function addTypenameToSelections(node) {
  if (node.kind === "SelectionSet") {
    return {
      ...node,
      selections: [
        {
          kind: "Field",
          name: {
            kind: "Name",
            value: "__typename",
            arguments: [],
            directives: [],
          },
        },
        ...node.selections.map((s) => addTypenameToSelections(s)),
      ],
    };
  } else if (node.selectionSet != null) {
    return {
      ...node,
      selectionSet: addTypenameToSelections(node.selectionSet),
    };
  } else if (node.kind === "Document") {
    return {
      ...node,
      definitions: node.definitions.map((d) => addTypenameToSelections(d)),
    };
  } else {
    return node;
  }
}

/**
 * removeClientOnlyFields recursively removes any fields marked with `@client`
 * in the given GraphQL document node, and returns a new copy. This enables us
 * to borrow queries and fragments from the client, and ignore the fields they
 * won't need preloaded for SSR. (This isn't just an optimization: the server
 * can't handle the `@client` directive and the query will fail if present!)
 */
function removeClientOnlyFields(node) {
  if (node.kind === "SelectionSet") {
    return {
      ...node,
      selections: node.selections
        .filter(
          (selection) =>
            !(
              selection.kind === "Field" &&
              selection.directives.some((d) => d.name.value === "client")
            )
        )
        .map((selection) => removeClientOnlyFields(selection)),
    };
  } else if (node.selectionSet != null) {
    return { ...node, selectionSet: removeClientOnlyFields(node.selectionSet) };
  } else if (node.kind === "Document") {
    return {
      ...node,
      definitions: node.definitions.map((d) => removeClientOnlyFields(d)),
    };
  } else {
    return node;
  }
}

module.exports = {
  loadGraphqlQuery,
  gql,
};
