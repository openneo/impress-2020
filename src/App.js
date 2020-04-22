import React from "react";
import { ApolloProvider } from "@apollo/react-hooks";
import { CSSReset, ThemeProvider, theme } from "@chakra-ui/core";
import WardrobePage from "./WardrobePage";

import ApolloClient from "apollo-boost";

const client = new ApolloClient({
  uri: "/api/graphql",
  cacheRedirects: {
    Query: {
      items: (_, args, { getCacheKey }) =>
        args.ids.map((id) => getCacheKey({ __typename: "Item", id })),
    },
  },
});

function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <CSSReset />
        <WardrobePage />
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default App;
