import React from "react";
import { ApolloProvider } from "@apollo/client";
import { CSSReset, ChakraProvider } from "@chakra-ui/core";
import theme from "@chakra-ui/theme";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import loadable from "@loadable/component";

import apolloClient from "./apolloClient";

const WardrobePage = loadable(() => import("./WardrobePage"));
const HomePage = loadable(() => import("./HomePage"));

/**
 * App is the entry point of our application. There's not a ton of exciting
 * stuff happening here, mostly just setting up some globals and theming!
 *
 * To really dive into the code, try going down into a page component!
 */
function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
