import React from "react";
import { Box, Button, Flex, Select } from "@chakra-ui/react";
import { Link, useHistory, useLocation } from "react-router-dom";

const PER_PAGE = 30;

function PaginationToolbar({ isLoading, totalCount, ...props }) {
  const { search } = useLocation();
  const history = useHistory();

  const currentOffset =
    parseInt(new URLSearchParams(search).get("offset")) || 0;

  const currentPageIndex = Math.floor(currentOffset / PER_PAGE);
  const currentPageNumber = currentPageIndex + 1;
  const numTotalPages = totalCount ? Math.ceil(totalCount / PER_PAGE) : null;

  const prevPageSearchParams = new URLSearchParams(search);
  const prevPageOffset = currentOffset - PER_PAGE;
  prevPageSearchParams.set("offset", prevPageOffset);
  const prevPageUrl = "?" + prevPageSearchParams.toString();

  const nextPageSearchParams = new URLSearchParams(search);
  const nextPageOffset = currentOffset + PER_PAGE;
  nextPageSearchParams.set("offset", nextPageOffset);
  const nextPageUrl = "?" + nextPageSearchParams.toString();

  // We disable the buttons if we don't know how many total items there are,
  // and therefore don't know how far navigation can go. We'll additionally
  // show a loading spinner if `isLoading` is true. (But it's possible the
  // buttons might be enabled, even if `isLoading` is true, because maybe
  // something _else_ is loading. `isLoading` is designed to tell us whether
  // waiting _might_ give us the data we need!)
  const prevPageIsDisabled = totalCount == null || prevPageOffset < 0;
  const nextPageIsDisabled = totalCount == null || nextPageOffset >= totalCount;

  const goToPageNumber = React.useCallback(
    (newPageNumber) => {
      const newPageIndex = newPageNumber - 1;
      const newPageOffset = newPageIndex * PER_PAGE;

      const newPageSearchParams = new URLSearchParams(search);
      newPageSearchParams.set("offset", newPageOffset);
      history.push({ search: newPageSearchParams.toString() });
    },
    [search, history]
  );

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
        <Flex align="center">
          <Box flex="0 0 auto">Page</Box>
          <Box width="1" />
          <PageNumberSelect
            currentPageNumber={currentPageNumber}
            numTotalPages={numTotalPages}
            onChange={goToPageNumber}
            marginBottom="-2px"
          />
          <Box width="1" />
          <Box flex="0 0 auto">of {numTotalPages}</Box>
        </Flex>
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

function PageNumberSelect({
  currentPageNumber,
  numTotalPages,
  onChange,
  ...props
}) {
  const allPageNumbers = Array.from({ length: numTotalPages }, (_, i) => i + 1);

  const handleChange = React.useCallback(
    (e) => onChange(Number(e.target.value)),
    [onChange]
  );

  return (
    <Select
      value={currentPageNumber}
      onChange={handleChange}
      width="7ch"
      variant="flushed"
      textAlign="center"
      {...props}
    >
      {allPageNumbers.map((pageNumber) => (
        <option key={pageNumber} value={pageNumber}>
          {pageNumber}
        </option>
      ))}
    </Select>
  );
}

export default PaginationToolbar;
