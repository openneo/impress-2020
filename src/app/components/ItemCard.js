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
import { CheckIcon, NotAllowedIcon, StarIcon } from "@chakra-ui/icons";
import { HiSparkles } from "react-icons/hi";
import { Link } from "react-router-dom";

import { safeImageUrl } from "../util";

function ItemCard({ item, badges, ...props }) {
  const borderColor = useColorModeValue("gray.100", "green.500");

  return (
    <Box
      as={Link}
      to={`/items/${item.id}`}
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

export function YouOwnThisBadge({ variant = "long" }) {
  let badge = (
    <Badge
      colorScheme="green"
      display="flex"
      alignItems="center"
      minHeight="1.5em"
    >
      <CheckIcon aria-label="Star" />
      {variant === "long" && <Box marginLeft="1">You own this!</Box>}
    </Badge>
  );

  if (variant === "short") {
    badge = <ItemBadgeTooltip label="You own this">{badge}</ItemBadgeTooltip>;
  }

  return badge;
}

export function YouWantThisBadge({ variant = "long" }) {
  let badge = (
    <Badge
      colorScheme="blue"
      display="flex"
      alignItems="center"
      minHeight="1.5em"
    >
      <StarIcon aria-label="Star" />
      {variant === "long" && <Box marginLeft="1">You want this!</Box>}
    </Badge>
  );

  if (variant === "short") {
    badge = <ItemBadgeTooltip label="You want this">{badge}</ItemBadgeTooltip>;
  }

  return badge;
}

function ZoneBadge({ variant, zoneLabel }) {
  // Shorten the label when necessary, to make the badges less bulky
  const shorthand = zoneLabel
    .replace("Background Item", "BG Item")
    .replace("Foreground Item", "FG Item")
    .replace("Lower-body", "Lower")
    .replace("Upper-body", "Upper")
    .replace("Transient", "Trans")
    .replace("Biology", "Bio");

  if (variant === "restricts") {
    return (
      <ItemBadgeTooltip
        label={`Restricted: This item can't be worn with ${zoneLabel} items`}
      >
        <Badge>
          <Box display="flex" alignItems="center">
            {shorthand} <NotAllowedIcon marginLeft="1" />
          </Box>
        </Badge>
      </ItemBadgeTooltip>
    );
  }

  if (shorthand !== zoneLabel) {
    return (
      <ItemBadgeTooltip label={zoneLabel}>
        <Badge>{shorthand}</Badge>
      </ItemBadgeTooltip>
    );
  }

  return <Badge>{shorthand}</Badge>;
}

export function ZoneBadgeList({ zones, variant }) {
  // Get the sorted zone labels. Sometimes an item occupies multiple zones of
  // the same name, so it's important to de-duplicate them!
  let labels = zones.map((z) => z.label);
  labels = new Set(labels);
  labels = [...labels].sort();

  return labels.map((label) => (
    <ZoneBadge key={label} zoneLabel={label} variant={variant} />
  ));
}

export function MaybeAnimatedBadge() {
  return (
    <ItemBadgeTooltip label="Maybe animated? (Support only)">
      <Badge
        colorScheme="orange"
        display="flex"
        alignItems="center"
        minHeight="1.5em"
      >
        <Box as={HiSparkles} aria-label="Sparkles" />
      </Badge>
    </ItemBadgeTooltip>
  );
}

export default ItemCard;
