import React from "react";
import { Box } from "@chakra-ui/react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useLocation,
} from "react-router-dom";

import PageLayout from "./PageLayout";
import WardrobePageLayout from "./WardrobePage/WardrobePageLayout";
import { loadable } from "./util";

const HomePage = loadable(() => import("./HomePage"));
const ItemSearchPage = loadable(() => import("./ItemSearchPage"));
const ItemPage = loadable(() => import("./ItemPage"));
const ItemTradesOfferingPage = loadable(() =>
  import("./ItemTradesPage").then((m) => m.ItemTradesOfferingPage)
);
const ItemTradesSeekingPage = loadable(() =>
  import("./ItemTradesPage").then((m) => m.ItemTradesSeekingPage)
);
const UserItemListsIndexPage = loadable(() =>
  import("./UserItemListsIndexPage")
);
const UserItemListPage = loadable(() => import("./UserItemListPage"));
const WardrobePage = loadable(() => import("./WardrobePage"), {
  fallback: <WardrobePageLayout />,
});

// ItemPage and ItemSearchPage need to share a search toolbar, so here it is!
// It'll load in dynamically like the page elements, with a hacky fallback to
// take up 40px of height until it loads.
//
// There very well be a better way to encapsulate this! It's not *great* to
// have this here. I just don't wanna over abstract it just yet 😅
const ItemSearchPageToolbar = loadable(
  () => import("./components/ItemSearchPageToolbar"),
  { fallback: <Box height="40px" /> }
);

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

      <Switch>
        <Route path="/items/search/:query?">
          <PageLayout>
            <ItemSearchPageToolbar marginBottom="6" />
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
            <ItemSearchPageToolbar marginBottom="8" />
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
        <Route path="/">
          <PageLayout hideHomeLink>
            <HomePage />
          </PageLayout>
        </Route>
      </Switch>
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

export default App;
