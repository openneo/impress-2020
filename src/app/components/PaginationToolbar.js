import React from "react";
import { Box, Button, Flex } from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";

const PER_PAGE = 30;

function PaginationToolbar({ isLoading, totalCount, ...props }) {
  const { search } = useLocation();

  const currentOffset =
    parseInt(new URLSearchParams(search).get("offset")) || 0;

  const currentPageIndex = Math.floor(currentOffset / PER_PAGE);
  const currentPageNumber = currentPageIndex + 1;
  const numTotalPages = totalCount ? Math.ceil(totalCount / PER_PAGE) : null;

  const prevPageSearchParams = new URLSearchParams(search);
  const prevPageOffset = currentOffset - PER_PAGE;
  prevPageSearchParams.set("offset", prevPageOffset);
  const prevPageUrl = "?" + prevPageSearchParams.toString();
  const prevPageIsDisabled = isLoading || prevPageOffset < 0;

  const nextPageSearchParams = new URLSearchParams(search);
  const nextPageOffset = currentOffset + PER_PAGE;
  nextPageSearchParams.set("offset", nextPageOffset);
  const nextPageUrl = "?" + nextPageSearchParams.toString();
  const nextPageIsDisabled = isLoading || nextPageOffset >= totalCount;

  return (
    <Flex align="center" justify="space-between" {...props}>
      <Button
        as={prevPageIsDisabled ? "button" : Link}
        to={prevPageIsDisabled ? undefined : prevPageUrl}
        _disabled={{ cursor: isLoading ? "wait" : "not-allowed", opacity: 0.4 }}
        isDisabled={prevPageIsDisabled}
      >
        ← Prev
      </Button>
      {numTotalPages && (
        <Box>
          Page {currentPageNumber} of {numTotalPages}
        </Box>
      )}
      <Button
        as={nextPageIsDisabled ? "button" : Link}
        to={nextPageIsDisabled ? undefined : nextPageUrl}
        _disabled={{ cursor: isLoading ? "wait" : "not-allowed", opacity: 0.4 }}
        isDisabled={nextPageIsDisabled}
      >
        Next →
      </Button>
    </Flex>
  );
}

export default PaginationToolbar;
