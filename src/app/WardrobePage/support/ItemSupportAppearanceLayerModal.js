import * as React from "react";
import {
  Button,
  Box,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/core";
import { ExternalLinkIcon } from "@chakra-ui/icons";

function ItemSupportAppearanceLayerModal({ item, itemLayer, isOpen, onClose }) {
  return (
    <Modal size="xl" isOpen={isOpen} onClose={onClose}>
      <ModalOverlay>
        <ModalContent>
          <ModalHeader>
            Layer {itemLayer.id}: {item.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody mb="4" pb="4">
            <Box
              as="dl"
              display="grid"
              gridTemplateColumns="max-content auto"
              gridRowGap="1"
              gridColumnGap="2"
            >
              <Box as="dt" gridColumn="1" fontWeight="bold">
                ID:
              </Box>
              <Box as="dd" gridColumn="2">
                {itemLayer.id}
              </Box>
              <Box as="dt" gridColumn="1" fontWeight="bold">
                Zone:
              </Box>
              <Box as="dd" gridColumn="2">
                {itemLayer.zone.label} ({itemLayer.zone.id})
              </Box>
              <Box as="dt" gridColumn="1" fontWeight="bold">
                Assets:
              </Box>
              <HStack as="dd" gridColumn="2" spacing="2">
                {itemLayer.svgUrl ? (
                  <Button
                    as="a"
                    size="xs"
                    target="_blank"
                    href={itemLayer.svgUrl}
                    colorScheme="teal"
                  >
                    SVG <ExternalLinkIcon ml="1" />
                  </Button>
                ) : (
                  <Button size="xs" isDisabled>
                    No SVG
                  </Button>
                )}
                {itemLayer.imageUrl ? (
                  <Button
                    as="a"
                    size="xs"
                    target="_blank"
                    href={itemLayer.imageUrl}
                    colorScheme="teal"
                  >
                    PNG <ExternalLinkIcon ml="1" />
                  </Button>
                ) : (
                  <Button size="xs" isDisabled>
                    No PNG
                  </Button>
                )}
              </HStack>
            </Box>
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
}

export default ItemSupportAppearanceLayerModal;
