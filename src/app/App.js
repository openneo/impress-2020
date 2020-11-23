import React from "react";
import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { CSSReset, ChakraProvider } from "@chakra-ui/core";
import defaultTheme from "@chakra-ui/theme";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useLocation,
} from "react-router-dom";
import loadable from "@loadable/component";
import { useAuth0 } from "@auth0/auth0-react";

import buildApolloClient from "./apolloClient";
import PageLayout from "./PageLayout";
import WardrobePageLayout from "./WardrobePage/WardrobePageLayout";

const HomePage = loadable(() => import("./HomePage"));
const ItemPage = loadable(() => import("./ItemPage"));
const ItemTradesOfferingPage = loadable(() =>
  import("./ItemTradesPage").then((m) => m.ItemTradesOfferingPage)
);
const ItemTradesSeekingPage = loadable(() =>
  import("./ItemTradesPage").then((m) => m.ItemTradesSeekingPage)
);
const ModelingPage = loadable(() => import("./ModelingPage"));
const UserItemsPage = loadable(() => import("./UserItemsPage"));
const WardrobePage = loadable(() => import("./WardrobePage"), {
  fallback: <WardrobePageLayout />,
});

const theme = {
  ...defaultTheme,
  styles: {
    ...defaultTheme.styles,
    global: ({ colorMode, ...rest }) => {
      const defaultGlobals = defaultTheme.styles.global({ colorMode, ...rest });
      return {
        ...defaultGlobals,
        html: {
          ...defaultGlobals.html,
          // HACK: Chakra sets body as the relative position element, which is
          //       fine, except its `min-height: 100%` doesn't actually work
          //       unless paired with height on the root element too!
          height: "100%",
        },
        body: {
          ...defaultGlobals.body,
          color: colorMode === "light" ? "green.800" : "green.50",
          transition: "all 0.25s",
        },
      };
    },
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
      <ScrollToTop />
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
              <Route path="/items/:itemId/trades/offering">
                <PageLayout>
                  <ItemTradesOfferingPage />
                </PageLayout>
              </Route>
              <Route path="/items/:itemId/trades/seeking">
                <PageLayout>
                  <ItemTradesSeekingPage />
                </PageLayout>
              </Route>
              <Route path="/items/:itemId">
                <PageLayout>
                  <ItemPage />
                </PageLayout>
              </Route>
              <Route path="/outfits/new">
                <WardrobePage />
              </Route>
              <Route path="/user/:userId/items">
                <PageLayout>
                  <UserItemsPage />
                </PageLayout>
              </Route>
              <Route path="/modeling">
                <PageLayout>
                  <ModelingPage />
                </PageLayout>
              </Route>
              <Route path="/">
                <PageLayout hideHomeLink>
                  <HomePage />
                </PageLayout>
              </Route>
            </Switch>
          </ChakraProvider>
        </ApolloProviderWithAuth0>
      </Auth0Provider>
    </Router>
  );
}

/**
 * ScrollToTop scrolls to the top of the page when you navigate.
 * Copied from https://reactrouter.com/web/guides/scroll-restoration/scroll-to-top.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
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
