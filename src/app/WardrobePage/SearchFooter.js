import React from "react";
import * as Sentry from "@sentry/react";
import { Box, Flex } from "@chakra-ui/react";
import SearchToolbar, { emptySearchQuery } from "./SearchToolbar";
import { MajorErrorMessage, TestErrorSender, useLocalStorage } from "../util";
import PaginationToolbar from "../components/PaginationToolbar";

/**
 * SearchFooter appears on large screens only, to let you search for new items
 * while still keeping the rest of the item screen open!
 */
function SearchFooter() {
  const [canUseSearchFooter, setCanUseSearchFooter] = useLocalStorage(
    "DTIFeatureFlagCanUseSearchFooter",
    false
  );

  React.useEffect(() => {
    if (window.location.search.includes("feature-flag-can-use-search-footer")) {
      setCanUseSearchFooter(true);
    }
  }, [setCanUseSearchFooter]);

  const [query, setQuery] = React.useState(emptySearchQuery);

  // TODO: Show the new footer to other users, too!
  if (!canUseSearchFooter) {
    return null;
  }

  return (
    <Box paddingX="4" paddingY="4">
      <Sentry.ErrorBoundary fallback={MajorErrorMessage}>
        <TestErrorSender />
        <Flex as="label" align="center">
          <Box fontWeight="600" flex="0 0 auto">
            Add new items:
          </Box>
          <Box width="8" />
          <SearchToolbar
            query={query}
            onChange={setQuery}
            flex="0 1 100%"
            suggestionsPlacement="top"
          />
          <Box width="8" />
          <Box flex="0 0 auto">
            <PaginationToolbar
              numTotalPages={1}
              currentPageNumber={1}
              goToPageNumber={() => alert("TODO")}
              buildPageUrl={() => null}
              size="sm"
            />
          </Box>
        </Flex>
      </Sentry.ErrorBoundary>
    </Box>
  );
}

export default SearchFooter;
