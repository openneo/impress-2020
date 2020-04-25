import React from "react";
import { css } from "emotion";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import {
  Box,
  Flex,
  IconButton,
  Image,
  PseudoBox,
  Skeleton,
  Tooltip,
  useTheme,
} from "@chakra-ui/core";

import "./ItemList.css";

function ItemList({ items, outfitState, dispatchToOutfit }) {
  return (
    <Flex direction="column">
      <TransitionGroup component={null}>
        {items.map((item) => (
          <CSSTransition
            key={item.id}
            classNames="item-list-row"
            timeout={500}
            onExit={(e) => {
              e.style.height = e.offsetHeight + "px";
            }}
          >
            <PseudoBox mb="2" mt="2">
              <Item
                item={item}
                outfitState={outfitState}
                dispatchToOutfit={dispatchToOutfit}
              />
            </PseudoBox>
          </CSSTransition>
        ))}
      </TransitionGroup>
    </Flex>
  );
}

export function ItemListContainer({ children }) {
  return <Flex direction="column">{children}</Flex>;
}

export function ItemListSkeleton({ count }) {
  return (
    <Flex direction="column">
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} mb="2" mt="2">
          <ItemSkeleton />
        </Box>
      ))}
    </Flex>
  );
}

export function Item({ item, outfitState, dispatchToOutfit }) {
  const { allItemIds } = outfitState;
  const isInOutfit = allItemIds.includes(item.id);
  const theme = useTheme();

  return (
    <Box
      role="group"
      mb="1"
      mt="1"
      p="1"
      rounded="lg"
      d="flex"
      alignItems="center"
      cursor="pointer"
      border="1px"
      borderColor="transparent"
      className={
        "item-container " +
        css`
          input:active + & {
            border-color: ${theme.colors.green["800"]};
          }
          input:focus + & {
            border-style: dotted;
            border-color: ${theme.colors.gray["400"]};
          }
        `
      }
    >
      <ItemThumbnail src={item.thumbnailUrl} />
      <Box width="3" />
      <ItemName>{item.name}</ItemName>
      <Box flexGrow="1" />
      {isInOutfit && (
        <Tooltip label="Remove" placement="top">
          <IconButton
            icon="delete"
            aria-label="Remove from outfit"
            variant="ghost"
            color="gray.400"
            onClick={(e) => {
              e.stopPropagation();
              dispatchToOutfit({ type: "removeItem", itemId: item.id });
            }}
            opacity="0"
            transitionProperty="opacity color"
            transitionDuration="0.2s"
            _groupHover={{
              opacity: 1,
              transitionDuration: "0.5s",
            }}
            _hover={{
              opacity: 1,
              color: "gray.800",
              backgroundColor: "gray.200",
            }}
            _focus={{
              opacity: 1,
              color: "gray.800",
              backgroundColor: "gray.200",
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}

function ItemSkeleton() {
  return (
    <Box d="flex" alignItems="center">
      <Skeleton width="50px" height="50px" />
      <Box width="3" />
      <Skeleton height="1.5rem" width="12rem" />
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

function ItemName({ children }) {
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
    >
      {children}
    </Box>
  );
}

export default ItemList;
