import "cypress-plugin-snapshots/commands";
import * as jwt from "jsonwebtoken";

// https://docs.cypress.io/guides/testing-strategies/auth0-authentication#Custom-Command-for-Auth0-Authentication
// Adapted and simplified by a lot though!
Cypress.Commands.add("logInAs", (username) => {
  if (username !== "dti-test") {
    throw new Error(`Cypress can only log in as dti-test right now`);
  }
  const password = Cypress.env("DTI_TEST_USER_PASSWORD");

  const client_id = Cypress.env("AUTH0_TEST_CLIENT_ID");
  const client_secret = Cypress.env("AUTH0_TEST_CLIENT_SECRET");
  const audience = "https://impress-2020.openneo.net/api";
  const scope = "";

  // TODO: This grant doesn't seem to include the custom username field. The
  //       app is generally resilient to that, but yeah, it means the username
  //       might not show up in the global header UI during these tests.
  cy.request({
    method: "POST",
    url: `https://openneo.us.auth0.com/oauth/token`,
    body: {
      grant_type: "password",
      username,
      password,
      audience,
      scope,
      client_id,
      client_secret,
    },
  }).then(({ body }) => {
    const decodedUser = jwt.decode(body.access_token);

    const auth0Cypress = {
      encodedToken: body.access_token,
      decodedUser,
    };

    window.localStorage.setItem("auth0Cypress", JSON.stringify(auth0Cypress));
  });
});
