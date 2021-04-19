require("dotenv").config();
const { initPlugin } = require("cypress-plugin-snapshots/plugin");

module.exports = (on, config) => {
  initPlugin(on, config);

  config.env.AUTH0_TEST_CLIENT_ID = process.env.AUTH0_TEST_CLIENT_ID;
  config.env.AUTH0_TEST_CLIENT_SECRET = process.env.AUTH0_TEST_CLIENT_SECRET;
  config.env.DTI_TEST_USER_PASSWORD = process.env.DTI_TEST_USER_PASSWORD;

  return config;
};
