import * as React from "react";
import { Box } from "@chakra-ui/react";

/**
 * Metadata is a UI component for showing metadata about something, as labels
 * and their values.
 */
function Metadata({ children, ...otherProps }) {
  return (
    <Box
      as="dl"
      display="grid"
      gridTemplateColumns="max-content auto"
      gridRowGap="1"
      gridColumnGap="2"
      {...otherProps}
    >
      {children}
    </Box>
  );
}

function MetadataLabel({ children }) {
  return (
    <Box as="dt" gridColumn="1" fontWeight="bold">
      {children}
    </Box>
  );
}

function MetadataValue({ children }) {
  return (
    <Box as="dd" gridColumn="2">
      {children}
    </Box>
  );
}

export default Metadata;
export { MetadataLabel, MetadataValue };
