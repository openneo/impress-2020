import React from "react";
import {
  Box,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Stack,
} from "@chakra-ui/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

import { ErrorMessage, Heading1 } from "./util";

function ConversionPage() {
  const { loading, error, data } = useQuery(
    gql`
      query ConversionPage {
        numAppearanceLayersConverted
        numAppearanceLayersTotal

        numPetLayersConverted: numAppearanceLayersConverted(type: PET_LAYER)
        numPetLayersTotal: numAppearanceLayersTotal(type: PET_LAYER)

        numItemLayersConverted: numAppearanceLayersConverted(type: ITEM_LAYER)
        numItemLayersTotal: numAppearanceLayersTotal(type: ITEM_LAYER)
      }
    `,
    { onError: (e) => console.error(e) }
  );

  return (
    <Box>
      <Heading1>HTML5 Conversion Hub</Heading1>
      <Box height="6" />
      <Stack
        direction={{ base: "column", sm: "row" }}
        spacing="12"
        align="center"
      >
        <ConversionProgress
          label="All layers"
          color="green.500"
          size="150px"
          numConverted={data?.numAppearanceLayersConverted}
          numTotal={data?.numAppearanceLayersTotal}
          isLoading={loading}
        />
        <ConversionProgress
          label="Pet layers"
          color="blue.500"
          size="125px"
          numConverted={data?.numPetLayersConverted}
          numTotal={data?.numPetLayersTotal}
          isLoading={loading}
        />
        <ConversionProgress
          label="Item layers"
          color="blue.500"
          size="125px"
          numConverted={data?.numItemLayersConverted}
          numTotal={data?.numItemLayersTotal}
          isLoading={loading}
        />
      </Stack>
      {error && (
        <ErrorMessage marginTop="2">
          Oops, we couldn't load the latest data: {error.message}
        </ErrorMessage>
      )}
    </Box>
  );
}

function ConversionProgress({
  label,
  color,
  size,
  numConverted,
  numTotal,
  isLoading,
}) {
  const convertedPercent = (numConverted / numTotal) * 100;

  return (
    <Flex direction="column" align="center">
      <CircularProgress
        color={color}
        size={size}
        value={convertedPercent || 0}
        isIndeterminate={isLoading}
      >
        {numConverted != null && numTotal != null && (
          <CircularProgressLabel>
            {Math.floor(convertedPercent)}%
          </CircularProgressLabel>
        )}
      </CircularProgress>
      <Box height="1" />
      <Box textAlign="center">
        <Box fontSize="xl">{label}</Box>
        {numConverted != null && numTotal != null && (
          <Box fontSize="xs">
            {numConverted.toLocaleString()} of {numTotal.toLocaleString()}
          </Box>
        )}
      </Box>
    </Flex>
  );
}

export default ConversionPage;
