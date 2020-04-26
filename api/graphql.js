const { ApolloServer } = require("../src/server/lib/apollo-server-vercel");
const { config } = require("../src/server");

const server = new ApolloServer(config);
module.exports = server.createHandler();
