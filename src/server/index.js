const { gql } = require("apollo-server");

const connectToDb = require("./db");
const { loadItems, buildItemTranslationLoader } = require("./loaders");

const typeDefs = gql`
  type Item {
    id: ID!
    name: String!
    thumbnailUrl: String!
  }

  type Query {
    items(ids: [ID!]!): [Item!]!
  }
`;

const resolvers = {
  Item: {
    name: async (item, _, { itemTranslationLoader }) => {
      const translation = await itemTranslationLoader.load(item.id);
      return translation.name;
    },
  },
  Query: {
    items: (_, { ids }, { db }) => loadItems(db, ids),
  },
};

const config = {
  typeDefs,
  resolvers,
  context: async () => {
    const db = await connectToDb();
    return {
      db,
      itemTranslationLoader: buildItemTranslationLoader(db),
    };
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
