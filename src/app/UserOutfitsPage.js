import React from "react";
import { Box, Center, Flex, Wrap, WrapItem } from "@chakra-ui/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

import { ErrorMessage, Heading1 } from "./util";
import {
  getVisibleLayers,
  petAppearanceFragmentForGetVisibleLayers,
} from "./components/useOutfitAppearance";
import HangerSpinner from "./components/HangerSpinner";
import useRequireLogin from "./components/useRequireLogin";

function UserOutfitsPage() {
  return (
    <Box>
      <Heading1 marginBottom="4">Your outfits</Heading1>
      <UserOutfitsPageContent />
    </Box>
  );
}

function UserOutfitsPageContent() {
  const { isLoading: userLoading } = useRequireLogin();

  const { loading: queryLoading, error, data } = useQuery(
    gql`
      query UserOutfitsPageContent($size: LayerImageSize) {
        currentUser {
          outfits {
            id
            name
            petAppearance {
              id
              layers {
                id
                svgUrl
                imageUrl(size: $size)
              }
              ...PetAppearanceForGetVisibleLayers
            }
          }
        }
      }
      ${petAppearanceFragmentForGetVisibleLayers}
    `,
    { variables: { size: "SIZE_" + getBestImageSize() }, skip: userLoading }
  );

  if (userLoading || queryLoading) {
    return (
      <Center>
        <HangerSpinner />
      </Center>
    );
  }

  if (error) {
    return <ErrorMessage>Error loading outfits: {error.message}</ErrorMessage>;
  }

  const outfits = data.currentUser.outfits;

  return (
    <Wrap spacing="4">
      {outfits.map((outfit) => (
        <WrapItem key={outfit.id}>
          <OutfitCard outfit={outfit} />
        </WrapItem>
      ))}
    </Wrap>
  );
}

function OutfitCard({ outfit }) {
  const thumbnailUrl = buildOutfitThumbnailUrl(outfit.petAppearance, []);

  return (
    <Flex
      direction="column"
      alignItems="center"
      textAlign="center"
      boxShadow="md"
      borderRadius="md"
      padding="3"
      width="calc(150px + 2em)"
    >
      <Box as="img" src={thumbnailUrl} width={150} height={150} />
      <Box>{outfit.name}</Box>
    </Flex>
  );
}

function buildOutfitThumbnailUrl(petAppearance, itemAppearances) {
  const size = getBestImageSize();
  const visibleLayers = getVisibleLayers(petAppearance, itemAppearances);
  const layerUrls = visibleLayers.map(
    (layer) => layer.svgUrl || layer.imageUrl
  );

  return `/api/outfitImage?size=${size}&layerUrls=${layerUrls.join(",")}`;
}

function getBestImageSize() {
  if (window.devicePixelRatio > 1) {
    return 300;
  } else {
    return 150;
  }
}

export default UserOutfitsPage;
