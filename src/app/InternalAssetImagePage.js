import React from "react";
import { Box, Center } from "@chakra-ui/react";
import { useLocation } from "react-router-dom";
import * as Sentry from "@sentry/react";
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
    </Box>
  );
}

function InternalAssetImagePageContent() {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const libraryUrl = search.get("libraryUrl");

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

  if (movieError) {
    return (
      <AssetImageErrorMessage>
        Error playing movie: {movieError.message}
      </AssetImageErrorMessage>
    );
  }

  return (
    <Box border="1px solid" borderColor="green.400">
      <OutfitMovieLayer
        libraryUrl={libraryUrl}
        width={600}
        height={600}
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
