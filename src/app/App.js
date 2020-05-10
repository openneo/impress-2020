import React from "react";
import ApolloClient from "apollo-boost";
import { ApolloProvider } from "@apollo/react-hooks";
import { CSSReset, ThemeProvider, theme } from "@chakra-ui/core";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import HomePage from "./HomePage";
import WardrobePage from "./WardrobePage";

/**
 * client is the global Apollo Client instance we use for GraphQL queries. This
 * is how we communicate with the server!
 */
const client = new ApolloClient({
  uri: "/api/graphql",
  cacheRedirects: {
    Query: {
      // Teach Apollo how to serve `items` queries from the cache. That way,
      // when you remove an item from your outfit, or add an item from search,
      // Apollo knows it already has the data it needs and doesn't need to ask
      // the server again!
      items: (_, args, { getCacheKey }) =>
        args.ids.map((id) => getCacheKey({ __typename: "Item", id })),

      // Teach Apollo how to serve `petAppearance` queries from the cache. That
      // way, when you switch pet poses, Apollo knows it already has the
      // appearance data and doesn't need to ask the server again!
      petAppearance: (_, args, { getCacheKey }) => {
        const { speciesId, colorId, emotion, genderPresentation } = args;
        const id = `${speciesId}-${colorId}-${emotion}-${genderPresentation}`;
        return getCacheKey({ __typename: "PetAppearance", id });
      },
    },
  },
});

/**
 * App is the entry point of our application. There's not a ton of exciting
 * stuff happening here, mostly just setting up some globals and theming!
 *
 * To really dive into the code, try going down into a page component!
 */
function App() {
  return (
    <Router>
      <ApolloProvider client={client}>
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
