import React from "react";
import { Box, Center, Flex, Wrap, WrapItem } from "@chakra-ui/react";
import { ClassNames } from "@emotion/react";
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
              species {
                id
                name
              }
              color {
                id
                name
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
            wornItems {
              id
              name
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
  const image = (
    <ClassNames>
      {({ css }) => (
        <Box
          as="img"
          src={buildOutfitThumbnailUrl(
            outfit.petAppearance,
            outfit.itemAppearances
          )}
          width={150}
          height={150}
          alt={buildOutfitAltText(outfit)}
          // Firefox shows alt text as a fallback for images it can't show yet.
          // Show our alt text clearly if the image failed to load... but hide
          // it if it's still loading. It's normal for these to take a second
          // to load on a new device, and the flash of text is unhelpful.
          color="white"
          fontSize="xs"
          padding="2"
          overflow="auto"
          className={css`
            &:-moz-loading {
              visibility: hidden;
            }
          `}
        />
      )}
    </ClassNames>
  );

  return (
    <Box
      as={Link}
      to={`/outfits/${outfit.id}`}
      display="block"
      transition="all 0.2s"
      _hover={{ transform: `scale(1.05)` }}
      _focus={{
        transform: `scale(1.05)`,
        boxShadow: "outline",
        outline: "none",
      }}
    >
      <OutfitCardLayout image={image} caption={outfit.name} />
    </Box>
  );
}

function OutfitCardLayout({ image, caption }) {
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
    >
      <Box
        width={150}
        height={150}
        marginBottom="2"
        borderRadius="md"
        background="gray.600"
      >
        {image}
      </Box>
      <Box>{caption}</Box>
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

function buildOutfitAltText(outfit) {
  const { petAppearance, wornItems } = outfit;
  const { species, color } = petAppearance;

  let altText = "";

  const petDescription = `${color.name} ${species.name}`;
  altText += petDescription;

  if (wornItems.length > 0) {
    const itemNames = wornItems
      .map((item) => item.name)
      .sort()
      .join(", ");
    altText += ` wearing ${itemNames}`;
  }

  return altText;
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
