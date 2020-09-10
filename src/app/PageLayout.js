import React from "react";
import { Box } from "@chakra-ui/core";
import loadable from "@loadable/component";

const GlobalNavBar = loadable(() => import("./GlobalNavBar"));

function PageLayout({ children }) {
  return (
    <Box padding="6" paddingTop="3" maxWidth="1024px" margin="0 auto">
      <Box
        width="100%"
        marginBottom="6"
        // Leave space while content is still loading
        minHeight="2rem"
      >
        <GlobalNavBar />
      </Box>
      {children}
    </Box>
  );
}

export default PageLayout;
