import React from "react";
import { Box, Center, Flex, Wrap, WrapItem } from "@chakra-ui/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { Link } from "react-router-dom";

import { ErrorMessage, Heading1, useCommonStyles } from "./util";
import {
  getVisibleLayers,
  petAppearanceFragmentForGetVisibleLayers,
  itemAppearanceFragmentForGetVisibleLayers,
} from "./components/useOutfitAppearance";
import HangerSpinner from "./components/HangerSpinner";
import useRequireLogin from "./components/useRequireLogin";
import WIPCallout from "./components/WIPCallout";

function UserOutfitsPage() {
  return (
    <Box>
      <Flex justifyContent="space-between" marginBottom="4">
        <Heading1>Your outfits</Heading1>
        <WIPCallout />
      </Flex>
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
          id
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
            itemAppearances {
              id
              layers {
                id
                svgUrl
                imageUrl(size: $size)
              }
              ...ItemAppearanceForGetVisibleLayers
            }
          }
        }
      }
      ${petAppearanceFragmentForGetVisibleLayers}
      ${itemAppearanceFragmentForGetVisibleLayers}
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

  if (outfits.length === 0) {
    return (
      <Box>You don't have any outfits yet. Maybe you can create some!</Box>
    );
  }

  return (
    <Wrap spacing="4" justify="space-around">
      {outfits.map((outfit) => (
        <WrapItem key={outfit.id}>
          <OutfitCard outfit={outfit} />
        </WrapItem>
      ))}
    </Wrap>
  );
}

function OutfitCard({ outfit }) {
  const thumbnailUrl = buildOutfitThumbnailUrl(
    outfit.petAppearance,
    outfit.itemAppearances
  );

  const { brightBackground } = useCommonStyles();

  return (
    <Flex
      direction="column"
      alignItems="center"
      textAlign="center"
      boxShadow="md"
      borderRadius="md"
      padding="3"
      width="calc(150px + 2em)"
      backgroundColor={brightBackground}
      transition="all 0.2s"
      as={Link}
      to={`/outfits/${outfit.id}`}
      _hover={{ transform: `scale(1.05)` }}
      _focus={{
        transform: `scale(1.05)`,
        boxShadow: "outline",
        outline: "none",
      }}
    >
      <Box
        as="img"
        src={thumbnailUrl}
        width={150}
        height={150}
        marginBottom="2"
        borderRadius="md"
        background="gray.600"
        transition="all 0.2s"
      />
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

/**
 * getBestImageSize returns the right image size to render at 150x150, for the
 * current device.
 *
 * On high-DPI devices, we'll download a 300x300 image to render at 150x150
 * scale. On standard-DPI devices, we'll download a 150x150 image, to save
 * bandwidth.
 */
function getBestImageSize() {
  if (window.devicePixelRatio > 1) {
    return 300;
  } else {
    return 150;
  }
}

export default UserOutfitsPage;
