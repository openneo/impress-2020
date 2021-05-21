import React from "react";
import { Button, Flex } from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";

function PaginationToolbar({ isLoading, totalCount, ...props }) {
  const { search } = useLocation();

  const currentOffset =
    parseInt(new URLSearchParams(search).get("offset")) || 0;

  const prevPageSearchParams = new URLSearchParams(search);
  const prevPageOffset = currentOffset - 30;
  prevPageSearchParams.set("offset", prevPageOffset);
  const prevPageUrl = "?" + prevPageSearchParams.toString();
  const prevPageIsDisabled = isLoading || prevPageOffset < 0;

  const nextPageSearchParams = new URLSearchParams(search);
  const nextPageOffset = currentOffset + 30;
  nextPageSearchParams.set("offset", nextPageOffset);
  const nextPageUrl = "?" + nextPageSearchParams.toString();
  const nextPageIsDisabled = isLoading || nextPageOffset >= totalCount;

  return (
    <Flex justify="space-between" {...props}>
      <Button
        as={prevPageIsDisabled ? "button" : Link}
        to={prevPageIsDisabled ? undefined : prevPageUrl}
        _disabled={{ cursor: isLoading ? "wait" : "not-allowed", opacity: 0.4 }}
        isDisabled={prevPageIsDisabled}
      >
        ← Prev
      </Button>
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
