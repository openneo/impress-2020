const { ApolloServer } = require("../src/server/apollo-server-vercel");
const { config } = require("../src/server");

const server = new ApolloServer(config);
module.exports = server.createHandler();
