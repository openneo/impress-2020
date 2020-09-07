import React from "react";
import { css } from "emotion";
import { Box, Image, Wrap, useColorModeValue, useTheme } from "@chakra-ui/core";

import { safeImageUrl } from "../util";

function ItemSummary({
  item,
  badges,
  isWorn,
  isDisabled,
  itemNameId,
  focusSelector,
}) {
  return (
    <Box display="flex">
      <Box flex="0 0 auto" marginRight="3">
        <ItemThumbnail
          src={safeImageUrl(item.thumbnailUrl)}
          isWorn={isWorn}
          isDisabled={isDisabled}
          focusSelector={focusSelector}
        />
      </Box>
      <Box flex="1 1 0" minWidth="0" marginTop="1px">
        <ItemName
          id={itemNameId}
          isWorn={isWorn}
          isDisabled={isDisabled}
          focusSelector={focusSelector}
        >
          {item.name}
        </ItemName>

        {badges}
      </Box>
    </Box>
  );
}

/**
 * ItemThumbnail shows a small preview image for the item, including some
 * hover/focus and worn/unworn states.
 */
function ItemThumbnail({ src, isWorn, isDisabled, focusSelector }) {
  const theme = useTheme();

  const borderColor = useColorModeValue(
    theme.colors.green["700"],
    "transparent"
  );

  const focusBorderColor = useColorModeValue(
    theme.colors.green["600"],
    "transparent"
  );

  return (
    <Box
      width="50px"
      height="50px"
      transition="all 0.15s"
      transformOrigin="center"
      position="relative"
      className={css([
        {
          transform: "scale(0.8)",
        },
        !isDisabled &&
          !isWorn && {
            [focusSelector]: {
              opacity: "0.9",
              transform: "scale(0.9)",
            },
          },
        !isDisabled &&
          isWorn && {
            opacity: 1,
            transform: "none",
          },
      ])}
    >
      <Box
        borderRadius="lg"
        boxShadow="md"
        border="1px"
        overflow="hidden"
        width="100%"
        height="100%"
        className={css([
          {
            borderColor: `${borderColor} !important`,
          },
          !isDisabled &&
            !isWorn && {
              [focusSelector]: {
                borderColor: `${focusBorderColor} !important`,
              },
            },
        ])}
      >
        <Image width="100%" height="100%" src={src} alt="" />
      </Box>
    </Box>
  );
}

/**
 * ItemName shows the item's name, including some hover/focus and worn/unworn
 * states.
 */
function ItemName({ children, isDisabled, focusSelector, ...props }) {
  const theme = useTheme();

  return (
    <Box
      fontSize="md"
      transition="all 0.15s"
      overflow="hidden"
      whiteSpace="nowrap"
      textOverflow="ellipsis"
      className={
        !isDisabled &&
        css`
          ${focusSelector} {
            opacity: 0.9;
            font-weight: ${theme.fontWeights.medium};
          }

          input:checked + .item-container & {
            opacity: 1;
            font-weight: ${theme.fontWeights.bold};
          }
        `
      }
      {...props}
    >
      {children}
    </Box>
  );
}

export function ItemSummaryBadgeList({ children }) {
  return (
    <Wrap spacing="2" marginTop="1" opacity="0.7">
      {children}
    </Wrap>
  );
}

export default ItemSummary;
