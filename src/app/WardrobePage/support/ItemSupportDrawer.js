import * as React from "react";
import gql from "graphql-tag";
import { useQuery, useMutation } from "@apollo/client";
import { css } from "emotion";
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
  HStack,
  Link,
  Select,
  Spinner,
  Stack,
  useBreakpointValue,
  useDisclosure,
} from "@chakra-ui/core";
import { CheckCircleIcon, EditIcon, ExternalLinkIcon } from "@chakra-ui/icons";

import ItemSupportAppearanceLayerModal from "./ItemSupportAppearanceLayerModal";
import { OutfitLayers } from "../../components/OutfitPreview";
import useOutfitAppearance from "../../components/useOutfitAppearance";
import useSupportSecret from "./useSupportSecret";

/**
 * ItemSupportDrawer shows Support UI for the item when open.
 *
 * This component controls the drawer element. The actual content is imported
 * from another lazy-loaded component!
 */
function ItemSupportDrawer({ item, outfitState, isOpen, onClose }) {
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
        <DrawerContent
          maxHeight={placement === "bottom" ? "90vh" : undefined}
          overflow="auto"
        >
          <DrawerCloseButton />
          <DrawerHeader color="green.800">
            {item.name}
            <Badge colorScheme="pink" marginLeft="3">
              Support <span aria-hidden="true">💖</span>
            </Badge>
          </DrawerHeader>
          <DrawerBody color="green.800">
            <Box paddingBottom="5">
              <Stack spacing="8">
                <ItemSupportSpecialColorFields item={item} />
                <ItemSupportAppearanceFields
                  item={item}
                  outfitState={outfitState}
                />
              </Stack>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </DrawerOverlay>
    </Drawer>
  );
}

function ItemSupportSpecialColorFields({ item }) {
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

function ItemSupportAppearanceFields({ item, outfitState }) {
  const { speciesId, colorId, pose } = outfitState;
  const { error, visibleLayers } = useOutfitAppearance({
    speciesId,
    colorId,
    pose,
    wornItemIds: [item.id],
  });

  const biologyLayers = visibleLayers.filter((l) => l.source === "pet");
  const itemLayers = visibleLayers.filter((l) => l.source === "item");
  itemLayers.sort((a, b) => a.zone.depth - b.zone.depth);

  return (
    <FormControl>
      <FormLabel>Appearance layers</FormLabel>
      <HStack spacing="4" overflow="auto" paddingX="1">
        {itemLayers.map((itemLayer) => (
          <ItemSupportAppearanceLayer
            biologyLayers={biologyLayers}
            itemLayer={itemLayer}
            item={item}
          />
        ))}
      </HStack>
      {error && <FormErrorMessage>{error.message}</FormErrorMessage>}
    </FormControl>
  );
}

function ItemSupportAppearanceLayer({ biologyLayers, itemLayer, item }) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box
      as="button"
      width="150px"
      textAlign="center"
      fontSize="xs"
      position="relative"
      onClick={onOpen}
    >
      <Box
        width="150px"
        height="150px"
        marginBottom="1"
        boxShadow="md"
        borderRadius="md"
      >
        <OutfitLayers visibleLayers={[...biologyLayers, itemLayer]} />
      </Box>
      <Box fontWeight="bold">{itemLayer.zone.label}</Box>
      <Box>Zone ID: {itemLayer.zone.id}</Box>
      <Box>Layer ID: {itemLayer.id}</Box>
      <Box
        className={css`
          opacity: 0;
          transition: opacity 0.2s;

          button:hover > &,
          button:focus > & {
            opacity: 1;
          }
        `}
        background="rgba(255, 255, 255, 0.8)"
        borderRadius="full"
        position="absolute"
        top="2"
        right="2"
        padding="2"
        alignItems="center"
        justifyContent="center"
        width="32px"
        height="32px"
      >
        <EditIcon boxSize="16px" position="relative" top="-2px" right="-1px" />
      </Box>
      <ItemSupportAppearanceLayerModal
        item={item}
        itemLayer={itemLayer}
        isOpen={isOpen}
        onClose={onClose}
      />
    </Box>
  );
}

export default ItemSupportDrawer;
