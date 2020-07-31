import * as React from "react";
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
  FormHelperText,
  FormLabel,
  Link,
  Select,
} from "@chakra-ui/core";
import { ExternalLinkIcon } from "@chakra-ui/icons";

/**
 * ItemSupportDrawer shows Support UI for the item when open.
 *
 * This component controls the drawer element. The actual content is imported
 * from another lazy-loaded component!
 */
function ItemSupportDrawer({ item, isOpen, onClose }) {
  return (
    <Drawer
      placement="bottom"
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
            <Badge colorScheme="purple" marginLeft="3">
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
  return (
    <FormControl>
      <FormLabel>Special color</FormLabel>
      <Select placeholder="Default: Auto-detect from item description">
        <option>Mutant</option>
        <option>Maraquan</option>
      </Select>
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
    </FormControl>
  );
}

export default ItemSupportDrawer;
