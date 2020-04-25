import React from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import {
  Box,
  Flex,
  IconButton,
  Image,
  PseudoBox,
  Stack,
  Skeleton,
  Tooltip,
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

function ItemListSkeleton({ count }) {
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

function Item({ item, outfitState, dispatchToOutfit }) {
  const { wornItemIds, allItemIds } = outfitState;

  const isWorn = wornItemIds.includes(item.id);
  const isInOutfit = allItemIds.includes(item.id);

  return (
    <PseudoBox
      role="group"
      d="flex"
      alignItems="center"
      cursor="pointer"
      onClick={() =>
        dispatchToOutfit({
          type: isWorn ? "unwearItem" : "wearItem",
          itemId: item.id,
        })
      }
    >
      <ItemThumbnail src={item.thumbnailUrl} isWorn={isWorn} />
      <Box width="3" />
      <ItemName isWorn={isWorn}>{item.name}</ItemName>
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
    </PseudoBox>
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

function ItemThumbnail({ src, isWorn }) {
  return (
    <PseudoBox
      rounded="lg"
      boxShadow="md"
      border="1px"
      borderColor={isWorn ? "green.700" : "green.700"}
      opacity={isWorn ? 1 : 0.7}
      width="50px"
      height="50px"
      overflow="hidden"
      transition="all 0.15s"
      transformOrigin="center"
      transform={isWorn ? null : "scale(0.8)"}
      _groupHover={
        !isWorn && {
          opacity: 0.9,
          transform: "scale(0.9)",
          borderColor: "green.600",
        }
      }
    >
      <Image src={src} />
    </PseudoBox>
  );
}

function ItemName({ children, isWorn }) {
  return (
    <PseudoBox
      fontSize="md"
      fontWeight={isWorn && "bold"}
      color="green.800"
      transition="all 0.15s"
      opacity={isWorn ? 1 : 0.8}
      _groupHover={
        !isWorn && {
          color: "green.800",
          fontWeight: "medium",
          opacity: 0.9,
        }
      }
    >
      {children}
    </PseudoBox>
  );
}

export default ItemList;
export { ItemListSkeleton };
