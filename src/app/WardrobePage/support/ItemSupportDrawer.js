import * as React from "react";
import gql from "graphql-tag";
import { useQuery, useMutation } from "@apollo/client";
import {
  Badge,
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Link,
  Select,
  Spinner,
  useBreakpointValue,
} from "@chakra-ui/core";
import { CheckCircleIcon, ExternalLinkIcon } from "@chakra-ui/icons";

import useSupportSecret from "./useSupportSecret";

/**
 * ItemSupportDrawer shows Support UI for the item when open.
 *
 * This component controls the drawer element. The actual content is imported
 * from another lazy-loaded component!
 */
function ItemSupportDrawer({ item, isOpen, onClose }) {
  const placement = useBreakpointValue({
    base: "bottom",
    lg: "right",

    // TODO: There's a bug in the Chakra RC that doesn't read the breakpoint
    // specification correctly - we need these extra keys until it's fixed!
    // https://github.com/chakra-ui/chakra-ui/issues/1444
    0: "bottom",
    1: "bottom",
    2: "right",
    3: "right",
  });

  return (
    <Drawer
      placement={placement}
      isOpen={isOpen}
      onClose={onClose}
      // blockScrollOnMount doesn't matter on our fullscreen UI, but the
      // default implementation breaks out layout somehow 🤔 idk, let's not!
      blockScrollOnMount={false}
    >
      <DrawerOverlay>
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            {item.name}
            <Badge colorScheme="pink" marginLeft="3">
              Support <span aria-hidden="true">💖</span>
            </Badge>
          </DrawerHeader>
          <DrawerBody>
            <Box paddingBottom="5">
              <SpecialColorFields item={item} />
            </Box>
          </DrawerBody>
        </DrawerContent>
      </DrawerOverlay>
    </Drawer>
  );
}

function SpecialColorFields({ item }) {
  const supportSecret = useSupportSecret();

  const { loading: itemLoading, error: itemError, data: itemData } = useQuery(
    gql`
      query ItemSupportDrawerManualSpecialColor($itemId: ID!) {
        item(id: $itemId) {
          id
          manualSpecialColor {
            id
          }
        }
      }
    `,
    {
      variables: { itemId: item.id },

      // HACK: I think it's a bug in @apollo/client 3.1.1 that, if the
      //     optimistic response sets `manualSpecialColor` to null, the query
      //     doesn't update, even though its cache has updated :/
      //
      //     This cheap trick of changing the display name every re-render
      //     persuades Apollo that this is a different query, so it re-checks
      //     its cache and finds the empty `manualSpecialColor`. Weird!
      displayName: `ItemSupportDrawerManualSpecialColor-${new Date()}`,
    }
  );

  const {
    loading: colorsLoading,
    error: colorsError,
    data: colorsData,
  } = useQuery(
    gql`
      query ItemSupportDrawerAllColors {
        allColors {
          id
          name
          isStandard
        }
      }
    `
  );

  const [
    mutate,
    { loading: mutationLoading, error: mutationError, data: mutationData },
  ] = useMutation(gql`
    mutation ItemSupportDrawerSetManualSpecialColor(
      $itemId: ID!
      $colorId: ID
      $supportSecret: String!
    ) {
      setManualSpecialColor(
        itemId: $itemId
        colorId: $colorId
        supportSecret: $supportSecret
      ) {
        id
        manualSpecialColor {
          id
        }
      }
    }
  `);

  const nonStandardColors =
    colorsData?.allColors?.filter((c) => !c.isStandard) || [];
  nonStandardColors.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <FormControl
      isInvalid={colorsError || itemError || mutationError ? true : false}
    >
      <FormLabel>Special color</FormLabel>
      <Select
        placeholder={
          colorsLoading || itemLoading
            ? "Loading…"
            : "Default: Auto-detect from item description"
        }
        value={itemData?.item?.manualSpecialColor?.id}
        isDisabled={mutationLoading}
        icon={
          colorsLoading || itemLoading || mutationLoading ? (
            <Spinner />
          ) : mutationData ? (
            <CheckCircleIcon />
          ) : undefined
        }
        onChange={(e) => {
          const colorId = e.target.value || null;
          const color =
            colorId != null ? { __typename: "Color", id: colorId } : null;
          mutate({
            variables: {
              itemId: item.id,
              colorId,
              supportSecret,
            },
            optimisticResponse: {
              __typename: "Mutation",
              setManualSpecialColor: {
                __typename: "Item",
                id: item.id,
                manualSpecialColor: color,
              },
            },
          });
        }}
      >
        {nonStandardColors.map((color) => (
          <option key={color.id} value={color.id}>
            {color.name}
          </option>
        ))}
      </Select>
      {colorsError && (
        <FormErrorMessage>{colorsError.message}</FormErrorMessage>
      )}
      {itemError && <FormErrorMessage>{itemError.message}</FormErrorMessage>}
      {mutationError && (
        <FormErrorMessage>{mutationError.message}</FormErrorMessage>
      )}
      {!colorsError && !itemError && !mutationError && (
        <FormHelperText>
          This controls which previews we show on the{" "}
          <Link
            href={`https://impress.openneo.net/items/${
              item.id
            }-${item.name.replace(/ /g, "-")}`}
            color="green.500"
            isExternal
          >
            item page <ExternalLinkIcon />
          </Link>
          .
        </FormHelperText>
      )}
    </FormControl>
  );
}

export default ItemSupportDrawer;
