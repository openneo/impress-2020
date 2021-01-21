import React from "react";
import { Box, Center, Flex, Wrap, WrapItem } from "@chakra-ui/react";
import { ClassNames } from "@emotion/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { Link } from "react-router-dom";

import { ErrorMessage, Heading1, useCommonStyles } from "./util";
import HangerSpinner from "./components/HangerSpinner";
import OutfitThumbnail, {
  outfitThumbnailFragment,
  getOutfitThumbnailRenderSize,
} from "./components/OutfitThumbnail";
import useRequireLogin from "./components/useRequireLogin";
import WIPCallout from "./components/WIPCallout";

function UserOutfitsPage() {
  return (
    <Box>
      <Flex justifyContent="space-between" marginBottom="4">
        <Heading1>Your outfits</Heading1>
        <WIPCallout details="This list doesn't work well with a lot of outfits yet. We'll paginate it soon! And starred outfits are coming, too!" />
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

            ...OutfitThumbnailFragment

            # For alt text
            petAppearance {
              species {
                id
                name
              }
              color {
                id
                name
              }
            }
            wornItems {
              id
              name
            }
          }
        }
      }
      ${outfitThumbnailFragment}
    `,
    {
      variables: {
        // NOTE: This parameter is used inside `OutfitThumbnailFragment`!
        size: "SIZE_" + getOutfitThumbnailRenderSize(),
      },
      context: { sendAuth: true },
      skip: userLoading,
    }
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
        <OutfitThumbnail
          petAppearance={outfit.petAppearance}
          itemAppearances={outfit.itemAppearances}
          alt={buildOutfitAltText(outfit)}
          // Firefox shows alt text as a fallback for images it can't show yet.
          // Show our alt text clearly if the image failed to load... but hide
          // it if it's still loading. It's normal for these to take a second
          // to load on a new device, and the flash of text is unhelpful.
          color="white"
          fontSize="xs"
          width={150}
          height={150}
          overflow="auto"
          className={css`
            &:-moz-loading {
              visibility: hidden;
            }

            &:-moz-broken {
              padding: 0.5rem;
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
        overflow="hidden"
      >
        {image}
      </Box>
      <Box>{caption}</Box>
    </Flex>
  );
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

export default UserOutfitsPage;
