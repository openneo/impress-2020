import React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";
import { css, cx } from "emotion";
import {
  Box,
  Button,
  Flex,
  Image,
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
  useTheme,
} from "@chakra-ui/core";

import { petAppearanceFragment } from "./useOutfitAppearance";
import { safeImageUrl } from "./util";

// From https://twemoji.twitter.com/, thank you!
import twemojiSmile from "../images/twemoji/smile.svg";
import twemojiCry from "../images/twemoji/cry.svg";
import twemojiSick from "../images/twemoji/sick.svg";
import twemojiMasc from "../images/twemoji/masc.svg";
import twemojiFem from "../images/twemoji/fem.svg";

function PosePicker({ outfitState, onLockFocus, onUnlockFocus }) {
  const theme = useTheme();

  const { speciesId, colorId } = outfitState;
  const { loading, error, poses } = useAvailablePoses({
    speciesId,
    colorId,
  });

  if (loading) {
    return null;
  }

  // This is a low-stakes enough control, where enough pairs don't have data
  // anyway, that I think I want to just not draw attention to failures.
  if (error) {
    return null;
  }

  // If there's only one pose anyway, don't bother showing a picker!
  const numAvailablePoses = Object.values(poses).filter((p) => p.isAvailable)
    .length;
  if (numAvailablePoses <= 1) {
    return null;
  }

  return (
    <Popover
      placement="top-end"
      usePortal
      onOpen={onLockFocus}
      onClose={onUnlockFocus}
    >
      {({ isOpen }) => (
        <>
          <PopoverTrigger>
            <Button
              variant="unstyled"
              boxShadow="md"
              d="flex"
              alignItems="center"
              justifyContent="center"
              _focus={{ borderColor: "gray.50" }}
              _hover={{ borderColor: "gray.50" }}
              outline="initial"
              className={cx(
                css`
                  border: 1px solid transparent !important;
                  transition: border-color 0.2s !important;

                  &:focus,
                  &:hover,
                  &.is-open {
                    border-color: ${theme.colors.gray["50"]} !important;
                  }

                  &.is-open {
                    border-width: 2px !important;
                  }
                `,
                isOpen && "is-open"
              )}
            >
              <EmojiImage src={twemojiSmile} aria-label="Choose a pose" />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Box p="4">
              <table width="100%" borderSpacing="8px">
                <thead>
                  <tr>
                    <th />
                    <Cell as="th">
                      <EmojiImage src={twemojiSmile} aria-label="Happy" />
                    </Cell>
                    <Cell as="th">
                      <EmojiImage src={twemojiCry} aria-label="Sad" />
                    </Cell>
                    <Cell as="th">
                      <EmojiImage src={twemojiSick} aria-label="Sick" />
                    </Cell>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <Cell as="th">
                      <EmojiImage src={twemojiMasc} aria-label="Masculine" />
                    </Cell>
                    <Cell as="td">
                      <PoseButton pose={poses.happyMasc} />
                    </Cell>
                    <Cell as="td">
                      <PoseButton pose={poses.sadMasc} />
                    </Cell>
                    <Cell as="td">
                      <PoseButton pose={poses.sickMasc} />
                    </Cell>
                  </tr>
                  <tr>
                    <Cell as="th">
                      <EmojiImage src={twemojiFem} aria-label="Feminine" />
                    </Cell>
                    <Cell as="td">
                      <PoseButton pose={poses.happyFem} />
                    </Cell>
                    <Cell as="td">
                      <PoseButton pose={poses.sadFem} />
                    </Cell>
                    <Cell as="td">
                      <PoseButton pose={poses.sickFem} />
                    </Cell>
                  </tr>
                </tbody>
              </table>
            </Box>
            <PopoverArrow />
          </PopoverContent>
        </>
      )}
    </Popover>
  );
}

function Cell({ children, as }) {
  const Tag = as;
  return (
    <Tag>
      <Flex justify="center" p="1">
        {children}
      </Flex>
    </Tag>
  );
}

function PoseButton({ pose }) {
  if (!pose.isAvailable) {
    return null;
  }

  return (
    <Box rounded="full" boxShadow="md" overflow="hidden">
      <Button variant="unstyled" width="auto" height="auto">
        <Image
          src={safeImageUrl(pose.thumbnailUrl)}
          width="50px"
          height="50px"
          className={css`
            opacity: 0.01;

            &[src] {
              opacity: 1;
              transition: opacity 0.2s;
            }
          `}
        />
      </Button>
    </Box>
  );
}

function EmojiImage({ src, "aria-label": ariaLabel }) {
  return <Image src={src} aria-label={ariaLabel} width="16px" height="16px" />;
}

function useAvailablePoses({ speciesId, colorId }) {
  const { loading, error, data } = useQuery(
    gql`
      query PosePicker($speciesId: ID!, $colorId: ID!) {
        petAppearances(speciesId: $speciesId, colorId: $colorId) {
          genderPresentation
          emotion
          ...PetAppearanceForOutfitPreview
        }
      }
      ${petAppearanceFragment}
    `,
    { variables: { speciesId, colorId } }
  );

  const petAppearances = data?.petAppearances || [];
  const hasAppearanceFor = (e, gp) =>
    petAppearances.some(
      (pa) => pa.emotion === e && pa.genderPresentation === gp
    );

  const poses = {
    happyMasc: {
      isAvailable: hasAppearanceFor("HAPPY", "MASCULINE"),
      thumbnailUrl: "http://pets.neopets.com/cp/42j5q3zx/1/1.png",
    },
    sadMasc: {
      isAvailable: hasAppearanceFor("SAD", "MASCULINE"),
      thumbnailUrl: "http://pets.neopets.com/cp/42j5q3zx/2/1.png",
    },
    sickMasc: {
      isAvailable: hasAppearanceFor("SICK", "MASCULINE"),
      thumbnailUrl: "http://pets.neopets.com/cp/42j5q3zx/4/1.png",
    },
    happyFem: {
      isAvailable: hasAppearanceFor("HAPPY", "FEMININE"),
      thumbnailUrl: "http://pets.neopets.com/cp/xgnghng7/1/1.png",
    },
    sadFem: {
      isAvailable: hasAppearanceFor("SAD", "FEMININE"),
      thumbnailUrl: "http://pets.neopets.com/cp/xgnghng7/2/1.png",
    },
    sickFem: {
      isAvailable: hasAppearanceFor("SICK", "FEMININE"),
      thumbnailUrl: "http://pets.neopets.com/cp/xgnghng7/4/1.png",
    },
  };

  return { loading, error, poses };
}

export default PosePicker;
