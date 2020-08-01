import * as React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";
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
import { ExternalLinkIcon } from "@chakra-ui/icons";

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
  const { loading, error, data } = useQuery(
    gql`
      query ItemSupportDrawerSpecialColorFields($itemId: ID!) {
        allColors {
          id
          name
          isStandard
        }

        item(id: $itemId) {
          manualSpecialColor {
            id
          }
        }
      }
    `,
    { variables: { itemId: item.id } }
  );

  const nonStandardColors = data?.allColors?.filter((c) => !c.isStandard) || [];
  nonStandardColors.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <FormControl isInvalid={error ? true : false}>
      <FormLabel>Special color</FormLabel>
      <Select
        placeholder={
          loading ? "Loading…" : "Default: Auto-detect from item description"
        }
        icon={loading ? <Spinner /> : undefined}
        value={data?.item?.manualSpecialColor?.id}
      >
        {nonStandardColors.map((color) => (
          <option key={color.id} value={color.id}>
            {color.name}
          </option>
        ))}
      </Select>
      {error && <FormErrorMessage>{error.message}</FormErrorMessage>}
      {!error && (
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
