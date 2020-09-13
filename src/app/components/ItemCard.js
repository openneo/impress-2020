import React from "react";
import { css } from "emotion";
import {
  Badge,
  Box,
  SimpleGrid,
  Tooltip,
  Wrap,
  useColorModeValue,
  useTheme,
} from "@chakra-ui/core";
import { StarIcon } from "@chakra-ui/icons";

import { safeImageUrl } from "../util";

function ItemCard({ item, badges, ...props }) {
  const borderColor = useColorModeValue("gray.100", "green.500");

  return (
    <Box
      as="a"
      href={`https://impress.openneo.net/items/${item.id}`}
      p="2"
      boxShadow="lg"
      borderRadius="lg"
      border="1px"
      borderColor={borderColor}
      className="item-card"
      width="100%"
      minWidth="0"
      {...props}
    >
      <ItemCardContent
        item={item}
        badges={badges}
        focusSelector=".item-card:hover &, .item-card:focus &"
      />
    </Box>
  );
}

export function ItemCardContent({
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
          item={item}
          isActive={isWorn}
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
export function ItemThumbnail({
  item,
  size = "md",
  isActive,
  isDisabled,
  focusSelector,
  ...props
}) {
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
      width={size === "lg" ? "80px" : "50px"}
      height={size === "lg" ? "80px" : "50px"}
      transition="all 0.15s"
      transformOrigin="center"
      position="relative"
      className={css([
        {
          transform: "scale(0.8)",
        },
        !isDisabled &&
          !isActive && {
            [focusSelector]: {
              opacity: "0.9",
              transform: "scale(0.9)",
            },
          },
        !isDisabled &&
          isActive && {
            opacity: 1,
            transform: "none",
          },
      ])}
      {...props}
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
            !isActive && {
              [focusSelector]: {
                borderColor: `${focusBorderColor} !important`,
              },
            },
        ])}
      >
        <Box
          as="img"
          width="100%"
          height="100%"
          src={safeImageUrl(item.thumbnailUrl)}
          alt={`Thumbnail art for ${item.name}`}
        />
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

export function ItemCardList({ children }) {
  return (
    <SimpleGrid columns={{ sm: 1, md: 2, lg: 3 }} spacing="6">
      {children}
    </SimpleGrid>
  );
}

export function ItemBadgeList({ children }) {
  return (
    <Wrap spacing="2" marginTop="1" opacity="0.7">
      {children}
    </Wrap>
  );
}

export function ItemBadgeTooltip({ label, children }) {
  return (
    <Tooltip
      label={<Box textAlign="center">{label}</Box>}
      placement="top"
      openDelay={400}
    >
      {children}
    </Tooltip>
  );
}

export function NcBadge() {
  return (
    <ItemBadgeTooltip label="Neocash">
      <Badge colorScheme="purple" display="block">
        NC
      </Badge>
    </ItemBadgeTooltip>
  );
}

export function NpBadge() {
  // NOTE: display:block helps with some layout consistency, overriding the
  //       default of inline-block.
  return (
    <ItemBadgeTooltip label="Neopoints">
      <Badge display="block">NP</Badge>
    </ItemBadgeTooltip>
  );
}

export function YouOwnThisBadge() {
  return (
    <Badge colorScheme="yellow" display="flex" alignItems="center">
      <StarIcon aria-label="Star" marginRight="1" />
      You own this!
    </Badge>
  );
}

export function YouWantThisBadge() {
  return (
    <Badge colorScheme="blue" display="flex" alignItems="center">
      <StarIcon aria-label="Star" marginRight="1" />
      You want this!
    </Badge>
  );
}

export default ItemCard;
