import React from "react";
import { Box, Center, Flex, Wrap, WrapItem } from "@chakra-ui/react";
import { ClassNames } from "@emotion/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { Link, useLocation } from "react-router-dom";

import { Heading1, MajorErrorMessage, useCommonStyles } from "./util";
import HangerSpinner from "./components/HangerSpinner";
import OutfitThumbnail from "./components/OutfitThumbnail";
import useRequireLogin from "./components/useRequireLogin";
import PaginationToolbar from "./components/PaginationToolbar";

function UserOutfitsPage() {
  return (
    <Box>
      <Heading1 marginBottom="4">Your outfits</Heading1>
      <UserOutfitsPageContent />
    </Box>
  );
}

const USER_OUTFITS_PAGE_QUERY = gql`
  query UserOutfitsPageContent($offset: Int!) {
    currentUser {
      id
      numTotalOutfits
      outfits(limit: 20, offset: $offset) {
        id
        name
        updatedAt

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
`;

const PER_PAGE = 20;

function UserOutfitsPageContent() {
  const { isLoading: userLoading } = useRequireLogin();

  const { search } = useLocation();
  const offset = parseInt(new URLSearchParams(search).get("offset")) || 0;

  const { loading: queryLoading, error, data } = useQuery(
    USER_OUTFITS_PAGE_QUERY,
    {
      variables: { offset },
      context: { sendAuth: true },
      skip: userLoading,
      // This will give us the cached numTotalOutfits while we wait for the
      // next page!
      returnPartialData: true,
    }
  );

  const numTotalOutfits = data?.currentUser?.numTotalOutfits || null;

  // Preload the previous and next pages. (Sigh, if we were doing cool Next.js
  // stuff, this would already be happening by next/link magic I think!)
  const prevPageOffset = offset - PER_PAGE;
  const nextPageOffset = offset + PER_PAGE;
  useQuery(USER_OUTFITS_PAGE_QUERY, {
    variables: { offset: prevPageOffset },
    context: { sendAuth: true },
    skip: userLoading || offset === 0 || prevPageOffset < 0,
  });
  useQuery(USER_OUTFITS_PAGE_QUERY, {
    variables: { offset: nextPageOffset },
    context: { sendAuth: true },
    skip:
      userLoading ||
      numTotalOutfits == null ||
      nextPageOffset >= numTotalOutfits,
  });

  const isLoading = userLoading || queryLoading;

  if (error) {
    return <MajorErrorMessage error={error} variant="network" />;
  }

  const outfits = data?.currentUser?.outfits || [];

  return (
    <Box>
      <PaginationToolbar
        isLoading={isLoading}
        totalCount={numTotalOutfits}
        numPerPage={PER_PAGE}
      />
      <Box height="6" />
      {isLoading ? (
        <Center>
          <HangerSpinner />
        </Center>
      ) : outfits.length === 0 ? (
        <Box>You don't have any outfits yet. Maybe you can create some!</Box>
      ) : (
        <Wrap spacing="4" justify="space-around">
          {outfits.map((outfit) => (
            <WrapItem key={outfit.id}>
              <OutfitCard outfit={outfit} />
            </WrapItem>
          ))}
        </Wrap>
      )}
      <Box height="6" />
      <PaginationToolbar
        isLoading={isLoading}
        totalCount={numTotalOutfits}
        numPerPage={PER_PAGE}
      />
    </Box>
  );
}

function OutfitCard({ outfit }) {
  const image = (
    <ClassNames>
      {({ css }) => (
        <OutfitThumbnail
          outfitId={outfit.id}
          updatedAt={outfit.updatedAt}
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
          loading="lazy"
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
