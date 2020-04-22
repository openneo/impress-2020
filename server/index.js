const { ApolloServer, gql } = require("apollo-server");

const connectToDb = require("./db");
const { loadItems, loadItemTranslation } = require("./loaders");

const typeDefs = gql`
  type Item {
    id: ID!
    name: String!
  }

  type Query {
    items(ids: [ID!]!): [Item!]!
  }
`;

const resolvers = {
  Item: {
    name: async (item, _, { db }) => {
      const translation = await loadItemTranslation(db, item.id, "en");
      return translation.name;
    },
  },
  Query: {
    items: (_, { ids }, { db }) => loadItems(db, ids),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async () => {
    const db = await connectToDb();
    return { db };
  },
});

if (require.main === module) {
  server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

module.exports = { server };
