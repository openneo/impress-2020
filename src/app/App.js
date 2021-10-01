import React from "react";
import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { CSSReset, ChakraProvider, extendTheme } from "@chakra-ui/react";
import { mode } from "@chakra-ui/theme-tools";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useLocation,
} from "react-router-dom";
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
import { useAuth0 } from "@auth0/auth0-react";

import buildApolloClient from "./apolloClient";
import PageLayout from "./PageLayout";
import WardrobePageLayout from "./WardrobePage/WardrobePageLayout";
import { loadable } from "./util";

const ConversionPage = loadable(() => import("./ConversionPage"));
const HomePage = loadable(() => import("./HomePage"));
const InternalAssetImagePage = loadable(() =>
  import("./InternalAssetImagePage")
);
const ItemSearchPage = loadable(() => import("./ItemSearchPage"));
const ItemPage = loadable(() => import("./ItemPage"));
const ItemTradesOfferingPage = loadable(() =>
  import("./ItemTradesPage").then((m) => m.ItemTradesOfferingPage)
);
const ItemTradesSeekingPage = loadable(() =>
  import("./ItemTradesPage").then((m) => m.ItemTradesSeekingPage)
);
const ModelingPage = loadable(() => import("./ModelingPage"));
const PrivacyPolicyPage = loadable(() => import("./PrivacyPolicyPage"));
const SupportPetAppearancesPage = loadable(() =>
  import("./SupportPetAppearancesPage")
);
const UserItemListsIndexPage = loadable(() =>
  import("./UserItemListsIndexPage")
);
const UserItemListPage = loadable(() => import("./UserItemListPage"));
const UserOutfitsPage = loadable(() => import("./UserOutfitsPage"));
const WardrobePage = loadable(() => import("./WardrobePage"), {
  fallback: <WardrobePageLayout />,
});

const theme = extendTheme({
  styles: {
    global: (props) => ({
      html: {
        // HACK: Chakra sets body as the relative position element, which is
        //       fine, except its `min-height: 100%` doesn't actually work
        //       unless paired with height on the root element too!
        height: "100%",
      },
      body: {
        background: mode("gray.50", "gray.800")(props),
        color: mode("green.800", "green.50")(props),
        transition: "all 0.25s",
      },
    }),
  },
});

Sentry.init({
  dsn:
    "https://c55875c3b0904264a1a99e5b741a221e@o506079.ingest.sentry.io/5595379",
  autoSessionTracking: true,
  integrations: [
    new Integrations.BrowserTracing({
      beforeNavigate: (context) => ({
        ...context,
        // Assume any path segment starting with a digit is an ID, and replace
        // it with `:id`. This will help group related routes in Sentry stats.
        // NOTE: I'm a bit uncertain about the timing on this for tracking
        //       client-side navs... but we now only track first-time
        //       pageloads, and it definitely works correctly for them!
        name: window.location.pathname.replaceAll(/\/[0-9][^/]*/g, "/:id"),
      }),

      // We have a _lot_ of location changes that don't actually signify useful
      // navigations, like in the wardrobe page. It could be useful to trace
      // them with better filtering someday, but frankly we don't use the perf
      // features besides Web Vitals right now, and those only get tracked on
      // first-time pageloads, anyway. So, don't track client-side navs!
      startTransactionOnLocationChange: false,
    }),
  ],

  // Since we're only tracking first-page loads and not navigations, 100%
  // sampling isn't actually so much! Tune down if it becomes a problem, tho.
  tracesSampleRate: 1.0,
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
              <Route path="/items/search/:query?">
                <PageLayout>
                  <ItemSearchPage />
                </PageLayout>
              </Route>
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
              <Route path="/outfits/:id">
                <WardrobePage />
              </Route>
              <Route path="/user/:userId/lists/:ownsOrWants(owns|wants)/:listId">
                <PageLayout>
                  <UserItemListPage />
                </PageLayout>
              </Route>
              <Route path="/user/:userId/lists">
                <PageLayout>
                  <UserItemListsIndexPage />
                </PageLayout>
              </Route>
              <Route path="/your-outfits">
                <PageLayout>
                  <UserOutfitsPage />
                </PageLayout>
              </Route>
              <Route path="/modeling">
                <PageLayout>
                  <ModelingPage />
                </PageLayout>
              </Route>
              <Route path="/privacy">
                <PageLayout>
                  <PrivacyPolicyPage />
                </PageLayout>
              </Route>
              <Route path="/conversion">
                <PageLayout>
                  <ConversionPage />
                </PageLayout>
              </Route>
              <Route path="/support/petAppearances">
                <PageLayout>
                  <SupportPetAppearancesPage />
                </PageLayout>
              </Route>
              <Route path="/internal/assetImage">
                <InternalAssetImagePage />
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
