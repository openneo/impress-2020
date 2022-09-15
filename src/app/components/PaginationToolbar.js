import React from "react";
import { Box, Button, Flex, Select } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/router";

function PaginationToolbar({
  isLoading,
  totalCount,
  numPerPage = 30,
  ...props
}) {
  const { query, push: pushHistory } = useRouter();

  const currentOffset = parseInt(query.offset) || 0;

  const currentPageIndex = Math.floor(currentOffset / numPerPage);
  const currentPageNumber = currentPageIndex + 1;
  const numTotalPages = totalCount ? Math.ceil(totalCount / numPerPage) : null;

  const prevPageSearchParams = new URLSearchParams(query);
  const prevPageOffset = currentOffset - numPerPage;
  prevPageSearchParams.set("offset", prevPageOffset);
  const prevPageUrl = "?" + prevPageSearchParams.toString();

  const nextPageSearchParams = new URLSearchParams(query);
  const nextPageOffset = currentOffset + numPerPage;
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
      const newPageOffset = newPageIndex * numPerPage;

      const newPageSearchParams = new URLSearchParams(query);
      newPageSearchParams.set("offset", newPageOffset);
      pushHistory("?" + newPageSearchParams.toString());
    },
    [query, pushHistory, numPerPage]
  );

  return (
    <Flex align="center" justify="space-between" {...props}>
      <LinkOrButton
        href={prevPageIsDisabled ? undefined : prevPageUrl}
        _disabled={{
          cursor: isLoading ? "wait" : "not-allowed",
          opacity: 0.4,
        }}
        isDisabled={prevPageIsDisabled}
      >
        ← Prev
      </LinkOrButton>
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
      <LinkOrButton
        href={nextPageIsDisabled ? undefined : nextPageUrl}
        _disabled={{
          cursor: isLoading ? "wait" : "not-allowed",
          opacity: 0.4,
        }}
        isDisabled={nextPageIsDisabled}
      >
        Next →
      </LinkOrButton>
    </Flex>
  );
}

function LinkOrButton({ href, ...props }) {
  if (href != null) {
    return (
      <Link href={href} passHref>
        <Button as="a" {...props} />
      </Link>
    );
  } else {
    return <Button {...props} />;
  }
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
