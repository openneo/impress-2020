import React from "react";
import { css } from "emotion";
import {
  Box,
  Flex,
  IconButton,
  Image,
  Skeleton,
  Tooltip,
  useTheme,
} from "@chakra-ui/core";

import "./ItemList.css";

export function ItemListContainer({ children }) {
  return <Flex direction="column">{children}</Flex>;
}

export function ItemListSkeleton({ count }) {
  return (
    <Flex direction="column">
      {Array.from({ length: count }).map((_, i) => (
        <ItemSkeleton key={i} />
      ))}
    </Flex>
  );
}

export function Item({ item, itemNameId, outfitState, dispatchToOutfit }) {
  const { allItemIds } = outfitState;
  const isInOutfit = allItemIds.includes(item.id);
  const theme = useTheme();

  return (
    <ItemContainer>
      <ItemThumbnail src={item.thumbnailUrl} />
      <Box width="3" />
      <ItemName id={itemNameId}>{item.name}</ItemName>
      <Box flexGrow="1" />
      {isInOutfit && (
        <Tooltip label="Remove" placement="top">
          <IconButton
            icon="delete"
            aria-label="Remove from outfit"
            variant="ghost"
            color="gray.400"
            onClick={(e) => {
              dispatchToOutfit({ type: "removeItem", itemId: item.id });
              e.preventDefault();
            }}
            opacity="0"
            transitionProperty="opacity color"
            transitionDuration="0.2s"
            className={css`
              &:focus,
              &:hover,
              .item-container:hover &,
              input:focus + .item-container & {
                opacity: 1;
                color: ${theme.colors.gray["800"]};
                backgroundcolor: ${theme.colors.gray["200"]};
              }
            `}
          />
        </Tooltip>
      )}
    </ItemContainer>
  );
}

function ItemSkeleton() {
  return (
    <ItemContainer>
      <Box d="flex" alignItems="center">
        <Skeleton width="50px" height="50px" />
        <Box width="3" />
        <Skeleton height="1.5rem" width="12rem" />
      </Box>
    </ItemContainer>
  );
}

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
      className={
        "item-container " +
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
        `
      }
    >
      {children}
    </Box>
  );
}

function ItemThumbnail({ src }) {
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
      className={css`
        .item-container:hover & {
          opacity: 0.9;
          transform: scale(0.9);
          bordercolor: ${theme.colors.green["600"]};
        }

        input:checked + .item-container & {
          opacity: 1;
          transform: none;
        }
      `}
    >
      <Image src={src} />
    </Box>
  );
}

function ItemName({ children, ...props }) {
  const theme = useTheme();

  return (
    <Box
      fontSize="md"
      color="green.800"
      transition="all 0.15s"
      className={css`
        .item-container:hover & {
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
