import React from "react";
import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { CSSReset, ChakraProvider } from "@chakra-ui/core";
import defaultTheme from "@chakra-ui/theme";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import loadable from "@loadable/component";

import apolloClient from "./apolloClient";

const WardrobePage = loadable(() => import("./WardrobePage"));
const HomePage = loadable(() => import("./HomePage"));

const theme = {
  ...defaultTheme,
  styles: {
    ...defaultTheme.styles,
    global: ({ colorMode, ...rest }) => ({
      ...defaultTheme.styles.global({ colorMode, ...rest }),
      color: colorMode === "light" ? "green.800" : "green.50",
      transition: "all 0.25s",
    }),
  },
};

/**
 * App is the entry point of our application. There's not a ton of exciting
 * stuff happening here, mostly just setting up some globals and theming!
 *
 * To really dive into the code, try going down into a page component!
 */
function App() {
  return (
    <Router>
      <Auth0Provider
        domain="openneo.us.auth0.com"
        clientId="8LjFauVox7shDxVufQqnviUIywMuuC4r"
        redirectUri={window.location.origin}
        audience="https://impress-2020.openneo.net/api"
        scope=""
      >
        <ApolloProvider client={apolloClient}>
          <ChakraProvider theme={theme}>
            <CSSReset />
            <Switch>
              <Route path="/outfits/new">
                <WardrobePage />
              </Route>
              <Route path="/">
                <HomePage />
              </Route>
            </Switch>
          </ChakraProvider>
        </ApolloProvider>
      </Auth0Provider>
    </Router>
  );
}

export default App;
