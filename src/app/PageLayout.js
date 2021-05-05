import React from "react";
import { Box, Flex, Grid, Link } from "@chakra-ui/react";
import { loadable } from "./util";
import * as Sentry from "@sentry/react";
import { WarningIcon } from "@chakra-ui/icons";

import ErrorGrundoImg from "./images/error-grundo.png";
import ErrorGrundoImg2x from "./images/error-grundo@2x.png";

const GlobalHeader = loadable(() => import("./GlobalHeader"));
const GlobalFooter = loadable(() => import("./GlobalFooter"));

function PageLayout({ children }) {
  return (
    <Box
      paddingX="6"
      paddingY="3"
      maxWidth="1024px"
      margin="0 auto"
      minHeight="100vh"
      display="flex"
      flexDirection="column"
    >
      <Box
        width="100%"
        marginBottom="6"
        // Leave space while content is still loading
        minHeight="2rem"
      >
        <GlobalHeader />
      </Box>
      <Box flex="1 0 0">
        <Sentry.ErrorBoundary fallback={MajorErrorMessage}>
          {children}
        </Sentry.ErrorBoundary>
      </Box>
      <Box width="100%" marginTop="12">
        <GlobalFooter />
      </Box>
    </Box>
  );
}

function MajorErrorMessage({ error }) {
  return (
    <Flex justify="center" marginTop="8">
      <Grid
        templateAreas='"icon title" "icon description" "icon details"'
        templateColumns="auto 1fr"
        maxWidth="500px"
        columnGap="4"
      >
        <Box gridArea="icon" marginTop="2">
          <Box
            as="img"
            src={ErrorGrundoImg}
            srcSet={`${ErrorGrundoImg} 1x, ${ErrorGrundoImg2x} 2x`}
            borderRadius="full"
            boxShadow="md"
            width="100px"
            height="100px"
            alt=""
          />
        </Box>
        <Box gridArea="title" fontSize="lg" marginBottom="1">
          Ah dang, I broke it 😖
        </Box>
        <Box gridArea="description" marginBottom="2">
          There was an error displaying this page. I'll get info about it
          automatically, but you can tell me more at{" "}
          <Link href="mailto:matchu@openneo.net" color="green.400">
            matchu@openneo.net
          </Link>
          !
        </Box>
        <Box gridArea="details" fontSize="xs" opacity="0.8">
          <WarningIcon
            marginRight="1.5"
            marginTop="-2px"
            aria-label="Error message"
          />
          "{error.message}"
        </Box>
      </Grid>
    </Flex>
  );
}

export default PageLayout;
