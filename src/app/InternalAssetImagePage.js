import React from "react";
import { Box, Center } from "@chakra-ui/react";
import * as Sentry from "@sentry/react";
import { Global, css } from "@emotion/react";
import { useRouter } from "next/router";

import OutfitMovieLayer from "./components/OutfitMovieLayer";

/**
 * We use this in /api/assetImage, to render the asset image! The headless
 * browser navigates here, and screenshots the canvas once it loads.
 */
function InternalAssetImagePage() {
  return (
    <Box padding="4">
      <Sentry.ErrorBoundary
        fallback={({ error }) => (
          <AssetImageErrorMessage>
            Unexpected error: {error.message}
          </AssetImageErrorMessage>
        )}
      >
        <InternalAssetImagePageContent />
      </Sentry.ErrorBoundary>
      <Global
        // We remove the default body background, so that the headless browser
        // can take the screenshot with transparency.
        styles={css`
          body {
            background: transparent;
          }
        `}
      />
    </Box>
  );
}

function InternalAssetImagePageContent() {
  const { query } = useRouter();
  const libraryUrl = query.libraryUrl;
  const size = query.size ?? "600";

  const [movieError, setMovieError] = React.useState(null);

  const onMovieError = React.useCallback((error) => {
    console.error("Error playing movie:", error);
    setMovieError(error);
  }, []);

  if (!libraryUrl) {
    return (
      <AssetImageErrorMessage>
        Error: libraryUrl parameter is required
      </AssetImageErrorMessage>
    );
  }

  if (!isNeopetsUrl(libraryUrl)) {
    return (
      <AssetImageErrorMessage>
        Error: libraryUrl must be an HTTPS Neopets URL, but was:{" "}
        <code>{JSON.stringify(libraryUrl)}</code>
      </AssetImageErrorMessage>
    );
  }

  if (size !== "600" && size !== "300" && size !== "150") {
    return (
      <AssetImageErrorMessage>
        Error: size must be 600, 300, or 150, but was: {size}
      </AssetImageErrorMessage>
    );
  }

  if (movieError) {
    return (
      <AssetImageErrorMessage>
        Error playing movie: {movieError.message}
      </AssetImageErrorMessage>
    );
  }

  return (
    <Box
      border="1px solid"
      borderColor="green.400"
      boxSizing="content-box"
      width={parseInt(size)}
      height={parseInt(size)}
    >
      <OutfitMovieLayer
        libraryUrl={libraryUrl}
        width={parseInt(size)}
        height={parseInt(size)}
        onError={onMovieError}
        canvasProps={{ id: "asset-image-canvas" }}
        isPaused
      />
    </Box>
  );
}

function isNeopetsUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch (e) {
    return false;
  }

  return url.origin === "https://images.neopets.com";
}

function AssetImageErrorMessage({ children }) {
  return (
    <Center
      width="600px"
      height="600px"
      color="red.400"
      border="1px solid"
      borderColor="red.400"
      textAlign="center"
      padding="4"
      id="asset-image-error-message"
    >
      <Box>{children}</Box>
    </Center>
  );
}

export default InternalAssetImagePage;
