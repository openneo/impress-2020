import React from "react";
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
const UserItemListPage = loadable(() => import("./UserItemListPage"));
const WardrobePage = loadable(() => import("./WardrobePage"), {
  fallback: <WardrobePageLayout />,
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

      <Switch>
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
