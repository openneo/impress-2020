import React from "react";
import { ApolloProvider } from "@apollo/react-hooks";
import { CSSReset, ThemeProvider, theme } from "@chakra-ui/core";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import apolloClient from "./apolloClient";
import HomePage from "./HomePage";
import WardrobePage from "./WardrobePage";

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
        <ThemeProvider theme={theme}>
          <CSSReset />
          <Switch>
            <Route path="/outfits/new">
              <WardrobePage />
            </Route>
            <Route path="/">
              <HomePage />
            </Route>
          </Switch>
        </ThemeProvider>
      </ApolloProvider>
    </Router>
  );
}

export default App;
