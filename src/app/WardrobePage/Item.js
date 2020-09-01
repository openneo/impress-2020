import React from "react";
import { css, cx } from "emotion";
import {
  Badge,
  Box,
  Flex,
  IconButton,
  Image,
  Skeleton,
  Tooltip,
  useColorModeValue,
  useTheme,
} from "@chakra-ui/core";
import { EditIcon, DeleteIcon, InfoIcon } from "@chakra-ui/icons";
import loadable from "@loadable/component";

import { safeImageUrl } from "../util";
import SupportOnly from "./support/SupportOnly";

const LoadableItemSupportDrawer = loadable(() =>
  import("./support/ItemSupportDrawer")
);

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
 *
 * NOTE: This component is memoized with React.memo. It's surpisingly expensive
 *       to re-render, because Chakra components are a lil bit expensive from
 *       their internal complexity, and we have a lot of them here. And it can
 *       add up when there's a lot of Items in the list. This contributes to
 *       wearing/unwearing items being noticeably slower on lower-power
 *       devices.
 */
function Item({ item, itemNameId, isWorn, isInOutfit, dispatchToOutfit }) {
  const [supportDrawerIsOpen, setSupportDrawerIsOpen] = React.useState(false);

  return (
    <>
      <ItemContainer>
        <Box flex="0 0 auto" marginRight="3">
          <ItemThumbnail
            src={safeImageUrl(item.thumbnailUrl)}
            isWorn={isWorn}
          />
        </Box>
        <Box
          flex="1 1 auto"
          display="flex"
          flexDirection="row"
          alignItems="center"
        >
          <ItemName id={itemNameId} isWorn={isWorn}>
            {item.name}
          </ItemName>
          {item.isNc && (
            <Badge colorScheme="cyan" marginLeft="2">
              NC
            </Badge>
          )}
        </Box>
        <Box flex="0 0 auto">
          <SupportOnly>
            <ItemActionButton
              icon={<EditIcon />}
              label="Support"
              onClick={(e) => {
                setSupportDrawerIsOpen(true);
                e.preventDefault();
              }}
            />
          </SupportOnly>
          <ItemActionButton
            icon={<InfoIcon />}
            label="More info"
            href={`https://impress.openneo.net/items/${
              item.id
            }-${item.name.replace(/ /g, "-")}`}
            onClick={(e) => e.stopPropagation()}
          />
          {isInOutfit && (
            <ItemActionButton
              icon={<DeleteIcon />}
              label="Remove"
              onClick={(e) => {
                dispatchToOutfit({ type: "removeItem", itemId: item.id });
                e.preventDefault();
              }}
            />
          )}
        </Box>
      </ItemContainer>
      <SupportOnly>
        <LoadableItemSupportDrawer
          item={item}
          isOpen={supportDrawerIsOpen}
          onClose={() => setSupportDrawerIsOpen(false)}
        />
      </SupportOnly>
    </>
  );
}

/**
 * ItemSkeleton is a placeholder for when an Item is loading.
 */
function ItemSkeleton() {
  return (
    <ItemContainer isFocusable={false}>
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
function ItemContainer({ children, isFocusable = true }) {
  const theme = useTheme();

  const focusBackgroundColor = useColorModeValue(
    theme.colors.gray["100"],
    theme.colors.gray["700"]
  );

  const activeBorderColor = useColorModeValue(
    theme.colors.green["400"],
    theme.colors.green["500"]
  );

  const focusCheckedBorderColor = useColorModeValue(
    theme.colors.green["800"],
    theme.colors.green["300"]
  );

  return (
    <Box
      p="1"
      my="1"
      borderRadius="lg"
      d="flex"
      alignItems="center"
      cursor={isFocusable ? "pointer" : undefined}
      border="1px"
      borderColor="transparent"
      className={cx([
        "item-container",
        isFocusable &&
          css`
            &:hover,
            input:focus + & {
              background-color: ${focusBackgroundColor};
            }

            input:active + & {
              border-color: ${activeBorderColor};
            }

            input:checked:focus + & {
              border-color: ${focusCheckedBorderColor};
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
      borderRadius="lg"
      boxShadow="md"
      border="1px"
      width="50px"
      height="50px"
      overflow="hidden"
      transition="all 0.15s"
      transformOrigin="center"
      className={css([
        {
          borderColor: `${borderColor} !important`,
          transform: "scale(0.8)",
        },
        !isWorn && {
          [containerHasFocus]: {
            opacity: "0.9",
            transform: "scale(0.9)",
            borderColor: `${focusBorderColor} !important`,
          },
        },
        isWorn && {
          opacity: 1,
          transform: "none",
        },
      ])}
    >
      <Image src={src} alt="" />
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
 * ItemActionButton is one of a list of actions a user can take for this item.
 */
function ItemActionButton({ icon, label, href, onClick }) {
  const theme = useTheme();

  const focusBackgroundColor = useColorModeValue(
    theme.colors.gray["300"],
    theme.colors.gray["800"]
  );
  const focusColor = useColorModeValue(
    theme.colors.gray["700"],
    theme.colors.gray["200"]
  );

  return (
    <Tooltip label={label} placement="top">
      <IconButton
        as={href ? "a" : "button"}
        icon={icon}
        aria-label={label}
        variant="ghost"
        color="gray.400"
        href={href}
        target={href ? "_blank" : null}
        onClick={onClick}
        className={css`
          opacity: 0;
          transition: all 0.2s;

          ${containerHasFocus} {
            opacity: 1;
          }

          &:focus,
          &:hover {
            opacity: 1;
            background-color: ${focusBackgroundColor};
            color: ${focusColor};
          }

          /* On touch devices, always show the buttons! This avoids having to
           * tap to reveal them (which toggles the item), or worse,
           * accidentally tapping a hidden button without realizing! */
          @media (hover: none) {
            opacity: 1;
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

export default React.memo(Item);
