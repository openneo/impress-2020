const express = require("express");
const { ApolloServer } = require("apollo-server-express");

const { config } = require("../src/server");

const server = new ApolloServer(config);
const app = express();
server.applyMiddleware({ app });

module.exports = app;
