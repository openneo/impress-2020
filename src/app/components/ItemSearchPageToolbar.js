import React from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { useCommonStyles } from "../util";
import SearchToolbar from "../WardrobePage/SearchToolbar";

function ItemSearchPageToolbar({ ...props }) {
  const { query, setQuery } = useSearchQueryInUrl();
  const { brightBackground } = useCommonStyles();

  return (
    <SearchToolbar
      query={query}
      onChange={setQuery}
      showItemsLabel
      background={brightBackground}
      boxShadow="md"
      {...props}
    />
  );
}

/**
 * useSearchQueryInUrl provides an API like useState, but stores the search
 * query in the URL! It also parses out the offset for us.
 */
export function useSearchQueryInUrl() {
  const history = useHistory();

  const { query: value } = useParams();
  const { pathname, search } = useLocation();

  // Parse the query from the location. (We memoize this because we use it as a
  // dependency in the query-saving hook below.)
  const parsedQuery = React.useMemo(() => {
    const searchParams = new URLSearchParams(search);
    return {
      value: decodeURIComponent(value || ""),
      filterToZoneLabel: searchParams.get("zone") || null,
      filterToItemKind: searchParams.get("kind") || null,
      filterToCurrentUserOwnsOrWants: searchParams.get("user") || null,
    };
  }, [search, value]);

  const offset = parseInt(new URLSearchParams(search).get("offset")) || 0;

  // While on the search page, save the most recent parsed query in state.
  const isSearchPage = pathname.startsWith("/items/search");
  const [savedQuery, setSavedQuery] = React.useState(parsedQuery);
  React.useEffect(() => {
    if (isSearchPage) {
      setSavedQuery(parsedQuery);
    }
  }, [isSearchPage, parsedQuery]);

  // Then, while not on the search page, use the saved query from state,
  // instead of the (presumably empty) parsed query from the URL.
  const query = isSearchPage ? parsedQuery : savedQuery;

  const setQuery = React.useCallback(
    (newQuery) => {
      let url = `/items/search`;

      if (newQuery.value) {
        url += "/" + encodeURIComponent(newQuery.value);
      }

      const newParams = new URLSearchParams();
      if (newQuery.filterToItemKind) {
        newParams.append("kind", newQuery.filterToItemKind);
      }
      if (newQuery.filterToZoneLabel) {
        newParams.append("zone", newQuery.filterToZoneLabel);
      }
      if (newQuery.filterToCurrentUserOwnsOrWants) {
        newParams.append("user", newQuery.filterToCurrentUserOwnsOrWants);
      }

      // NOTE: We omit `offset`, because changing the query should reset us
      //       back to the first page!
      const search = newParams.toString();
      if (search) {
        url += "?" + search;
      }

      // TODO: Tbh would be even nicer for this to be a like... timed thing?
      // We use replace to avoid spamming the history too much, but sometimes
      // the user's query meaningfully *does* change without intermediate
      // navigation, like if they see the results and decide it's the wrong
      // thing.
      if (isSearchPage) {
        history.replace(url);
      } else {
        // When you use the search toolbar from the item page, treat it as a
        // full navigation!
        history.push(url);
      }
    },
    [history, isSearchPage]
  );

  // NOTE: We don't provide a `setOffset`, because that's handled via
  //       pagination links.
  return { query, offset, setQuery };
}

export default ItemSearchPageToolbar;
