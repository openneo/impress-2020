import React from "react";
import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { CSSReset, ChakraProvider } from "@chakra-ui/core";
import defaultTheme from "@chakra-ui/theme";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import loadable from "@loadable/component";
import { useAuth0 } from "@auth0/auth0-react";

import buildApolloClient from "./apolloClient";

const ItemsPage = loadable(() => import("./ItemsPage"));
const HomePage = loadable(() => import("./HomePage"));
const WardrobePage = loadable(() => import("./WardrobePage"));

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
        <ApolloProviderWithAuth0>
          <ChakraProvider theme={theme}>
            <CSSReset />
            <Switch>
              <Route path="/outfits/new">
                <WardrobePage />
              </Route>
              <Route path="/user/:userId/items">
                <ItemsPage />
              </Route>
              <Route path="/">
                <HomePage />
              </Route>
            </Switch>
          </ChakraProvider>
        </ApolloProviderWithAuth0>
      </Auth0Provider>
    </Router>
  );
}

function ApolloProviderWithAuth0({ children }) {
  const auth0 = useAuth0();
  const auth0Ref = React.useRef(auth0);

  React.useEffect(() => {
    auth0Ref.current = auth0;
  }, [auth0]);

  const client = React.useMemo(
    () => buildApolloClient(() => auth0Ref.current),
    []
  );
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

export default App;
