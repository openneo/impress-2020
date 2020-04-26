import React from "react";
import { css, cx } from "emotion";
import {
  Box,
  Flex,
  IconButton,
  Image,
  Skeleton,
  Tooltip,
  useTheme,
} from "@chakra-ui/core";

/**
 * Item show a basic summary of an item, in the context of the current outfit!
 *
 * It also responds to the focus state of an `input` as its previous sibling.
 * This will be an invisible radio/checkbox that controls the actual wear
 * state.
 *
 * In fact, this component can't trigger wear or unwear events! When you click
 * it in the app, you're actually clicking a <label> that wraps the radio or
 * checkbox. We _do_ control the Remove button in here, though!
 */
export function Item({ item, itemNameId, outfitState, dispatchToOutfit }) {
  const { wornItemIds, allItemIds } = outfitState;
  const isWorn = wornItemIds.includes(item.id);
  const isInOutfit = allItemIds.includes(item.id);

  return (
    <ItemContainer>
      <ItemThumbnail src={item.thumbnailUrl} isWorn={isWorn} />
      <Box width="3" />
      <ItemName id={itemNameId} isWorn={isWorn}>
        {item.name}
      </ItemName>
      <Box flexGrow="1" />
      {isInOutfit && (
        <RemoveItemButton
          onClick={() =>
            dispatchToOutfit({ type: "removeItem", itemId: item.id })
          }
        />
      )}
    </ItemContainer>
  );
}

/**
 * ItemSkeleton is a placeholder for when an Item is loading.
 */
function ItemSkeleton() {
  return (
    <ItemContainer>
      <Skeleton width="50px" height="50px" />
      <Box width="3" />
      <Skeleton height="1.5rem" width="12rem" />
    </ItemContainer>
  );
}

/**
 * ItemContainer is the outermost element of an `Item`.
 *
 * It provides spacing, but also is responsible for a number of hover/focus/etc
 * styles - including for its children, who sometimes reference it as an
 * .item-container parent!
 */
function ItemContainer({ children }) {
  const theme = useTheme();

  return (
    <Box
      p="1"
      my="1"
      rounded="lg"
      d="flex"
      alignItems="center"
      cursor="pointer"
      border="1px"
      borderColor="transparent"
      className={cx([
        "item-container",
        css`
          &:hover,
          input:focus + & {
            background-color: ${theme.colors.gray["100"]};
          }

          input:active + & {
            border-color: ${theme.colors.green["400"]};
          }

          input:checked:focus + & {
            border-color: ${theme.colors.green["800"]};
          }
        `,
      ])}
    >
      {children}
    </Box>
  );
}

/**
 * ItemThumbnail shows a small preview image for the item, including some
 * hover/focus and worn/unworn states.
 */
function ItemThumbnail({ src, isWorn }) {
  const theme = useTheme();
  return (
    <Box
      rounded="lg"
      boxShadow="md"
      border="1px"
      borderColor="green.700"
      width="50px"
      height="50px"
      overflow="hidden"
      transition="all 0.15s"
      transformOrigin="center"
      transform="scale(0.8)"
      className={css([
        !isWorn && {
          [containerHasFocus]: {
            opacity: "0.9",
            transform: "scale(0.9)",
            borderColor: theme.colors.green["600"],
          },
        },
        isWorn && {
          opacity: 1,
          transform: "none",
        },
      ])}
    >
      <Image src={src} />
    </Box>
  );
}

/**
 * ItemName shows the item's name, including some hover/focus and worn/unworn
 * states.
 */
function ItemName({ children, ...props }) {
  const theme = useTheme();

  return (
    <Box
      fontSize="md"
      color="green.800"
      transition="all 0.15s"
      className={css`
        ${containerHasFocus} {
          opacity: 0.9;
          font-weight: ${theme.fontWeights.medium};
        }

        input:checked + .item-container & {
          opacity: 1;
          font-weight: ${theme.fontWeights.bold};
        }
      `}
      {...props}
    >
      {children}
    </Box>
  );
}

/**
 * RemoveItemButton lets the user remove the item from the outfit altogether.
 *
 * This removes it from their "closet", which is even more severe than
 * unwearing it: it disappears from your item list entirely, until you find it
 * again via search!
 */
function RemoveItemButton({ onClick }) {
  const theme = useTheme();

  return (
    <Tooltip label="Remove" placement="top">
      <IconButton
        icon="delete"
        aria-label="Remove from outfit"
        variant="ghost"
        color="gray.400"
        onClick={(e) => {
          onClick();
          e.preventDefault();
        }}
        className={css`
          opacity: 0;
          transition: all 0.2s;

          ${containerHasFocus} {
            opacity: 1;
          }

          &:focus,
          &:hover {
            opacity: 1;
            background-color: ${theme.colors.gray["300"]};
            color: ${theme.colors.gray["700"]};
          }
        `}
      />
    </Tooltip>
  );
}

/**
 * ItemListContainer is a container for Item components! Wrap your Item
 * components in this to ensure a consistent list layout.
 */
export function ItemListContainer({ children }) {
  return <Flex direction="column">{children}</Flex>;
}

/**
 * ItemListSkeleton is a placeholder for when an ItemListContainer and its
 * Items are loading.
 */
export function ItemListSkeleton({ count }) {
  return (
    <ItemListContainer>
      {Array.from({ length: count }).map((_, i) => (
        <ItemSkeleton key={i} />
      ))}
    </ItemListContainer>
  );
}

/**
 * containerHasFocus is a common CSS selector, for the case where our parent
 * .item-container is hovered or the adjacent hidden radio/checkbox is
 * focused.
 */
const containerHasFocus =
  ".item-container:hover &, input:focus + .item-container &";
