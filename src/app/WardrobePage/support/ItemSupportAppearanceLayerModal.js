import * as React from "react";
import {
  Button,
  Box,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
} from "@chakra-ui/core";
import { ExternalLinkIcon } from "@chakra-ui/icons";

import { OutfitLayers } from "../../components/OutfitPreview";
import SpeciesColorPicker from "../../components/SpeciesColorPicker";
import useOutfitAppearance from "../../components/useOutfitAppearance";

function ItemSupportAppearanceLayerModal({
  item,
  itemLayer,
  outfitState,
  isOpen,
  onClose,
}) {
  return (
    <Modal size="xl" isOpen={isOpen} onClose={onClose}>
      <ModalOverlay>
        <ModalContent color="green.800">
          <ModalHeader>
            Layer {itemLayer.id}: {item.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody mb="4" pb="4">
            <Metadata>
              <MetadataLabel>ID:</MetadataLabel>
              <MetadataValue>{itemLayer.id}</MetadataValue>
              <MetadataLabel>Zone:</MetadataLabel>
              <MetadataValue>
                {itemLayer.zone.label} ({itemLayer.zone.id})
              </MetadataValue>
              <MetadataLabel>Assets:</MetadataLabel>
              <MetadataValue>
                <HStack spacing="2">
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
              </MetadataValue>
            </Metadata>
            <Box height="8" />
            <ItemSupportAppearanceLayerPetCompatibility
              item={item}
              itemLayer={itemLayer}
              outfitState={outfitState}
            />
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
}

function ItemSupportAppearanceLayerPetCompatibility({
  item,
  itemLayer,
  outfitState,
}) {
  const [selectedBiology, setSelectedBiology] = React.useState({
    speciesId: outfitState.speciesId,
    colorId: outfitState.colorId,
    pose: outfitState.pose,
    isValid: true,
  });
  const [visibleBiology, setVisibleBiology] = React.useState(selectedBiology);
  console.log(selectedBiology, visibleBiology);

  const { loading, error, visibleLayers } = useOutfitAppearance({
    speciesId: visibleBiology.speciesId,
    colorId: visibleBiology.colorId,
    pose: visibleBiology.pose,
    wornItemIds: [item.id],
  });

  const biologyLayers = visibleLayers.filter((l) => l.source === "pet");

  return (
    <FormControl isInvalid={error || !selectedBiology.isValid ? true : false}>
      <FormLabel>Pet compatibility</FormLabel>
      <RadioGroup
        colorScheme="green"
        value={itemLayer.bodyId}
        onChange={(e) => console.log(e)}
        marginBottom="4"
      >
        <Radio value="0">
          Fits all pets{" "}
          <Box display="inline" color="gray.400" fontSize="sm">
            (Body ID: 0)
          </Box>
        </Radio>
        <Radio as="div" value="100" marginTop="2">
          Fits all pets with the same body as:{" "}
          <Box display="inline" color="gray.400" fontSize="sm">
            (Body ID: 100)
          </Box>
        </Radio>
      </RadioGroup>
      <Box display="flex" flexDirection="column" alignItems="center">
        <Box
          width="150px"
          height="150px"
          marginTop="2"
          marginBottom="2"
          boxShadow="md"
          borderRadius="md"
        >
          <OutfitLayers
            loading={loading}
            visibleLayers={[...biologyLayers, itemLayer]}
          />
        </Box>
        <SpeciesColorPicker
          speciesId={selectedBiology.speciesId}
          colorId={selectedBiology.colorId}
          idealPose={outfitState.pose}
          isDisabled={itemLayer.bodyId === "0"}
          size="sm"
          showPlaceholders
          onChange={(species, color, isValid, pose) => {
            const speciesId = species.id;
            const colorId = color.id;

            setSelectedBiology({ speciesId, colorId, isValid, pose });
            if (isValid) {
              setVisibleBiology({ speciesId, colorId, isValid, pose });
            }
          }}
        />
        <Box height="1" />
        {!error && (
          <FormHelperText>
            If it doesn't look right, try some other options until it does!
          </FormHelperText>
        )}
        {error && <FormErrorMessage>{error.message}</FormErrorMessage>}
      </Box>
    </FormControl>
  );
}

function Metadata({ children }) {
  return (
    <Box
      as="dl"
      display="grid"
      gridTemplateColumns="max-content auto"
      gridRowGap="1"
      gridColumnGap="2"
    >
      {children}
    </Box>
  );
}

function MetadataLabel({ children }) {
  return (
    <Box as="dt" gridColumn="1" fontWeight="bold">
      {children}
    </Box>
  );
}

function MetadataValue({ children }) {
  return (
    <Box as="dd" gridColumn="2">
      {children}
    </Box>
  );
}

export default ItemSupportAppearanceLayerModal;
