import * as React from "react";
import gql from "graphql-tag";
import { useMutation } from "@apollo/client";
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
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Spinner,
  useToast,
} from "@chakra-ui/core";
import { ExternalLinkIcon } from "@chakra-ui/icons";

import { OutfitLayers } from "../../components/OutfitPreview";
import SpeciesColorPicker from "../../components/SpeciesColorPicker";
import useOutfitAppearance, {
  itemAppearanceFragment,
} from "../../components/useOutfitAppearance";
import useSupportSecret from "./useSupportSecret";

function ItemSupportAppearanceLayerModal({
  item,
  itemLayer,
  outfitState,
  isOpen,
  onClose,
}) {
  const [selectedBodyId, setSelectedBodyId] = React.useState(itemLayer.bodyId);
  const [previewBiology, setPreviewBiology] = React.useState({
    speciesId: outfitState.speciesId,
    colorId: outfitState.colorId,
    pose: outfitState.pose,
    isValid: true,
  });
  const supportSecret = useSupportSecret();
  const toast = useToast();

  const [
    mutate,
    { loading: mutationLoading, error: mutationError },
  ] = useMutation(
    gql`
      mutation ItemSupportSetLayerBodyId(
        $layerId: ID!
        $bodyId: ID!
        $supportSecret: String!
        $outfitSpeciesId: ID!
        $outfitColorId: ID!
        $formPreviewSpeciesId: ID!
        $formPreviewColorId: ID!
      ) {
        setLayerBodyId(
          layerId: $layerId
          bodyId: $bodyId
          supportSecret: $supportSecret
        ) {
          # This mutation returns the affected AppearanceLayer. Fetch the
          # updated fields, including the appearance on the outfit pet and the
          # form preview pet, to automatically update our cached appearance in
          # the rest of the app. That means you should be able to see your
          # changes immediately!
          id
          bodyId
          item {
            id
            appearanceOnOutfit: appearanceOn(
              speciesId: $outfitSpeciesId
              colorId: $outfitColorId
            ) {
              ...ItemAppearanceForOutfitPreview
            }

            appearanceOnFormPreviewPet: appearanceOn(
              speciesId: $formPreviewSpeciesId
              colorId: $formPreviewColorId
            ) {
              ...ItemAppearanceForOutfitPreview
            }
          }
        }
      }
      ${itemAppearanceFragment}
    `,
    {
      variables: {
        layerId: itemLayer.id,
        bodyId: selectedBodyId,
        supportSecret,
        outfitSpeciesId: outfitState.speciesId,
        outfitColorId: outfitState.colorId,
        formPreviewSpeciesId: previewBiology.speciesId,
        formPreviewColorId: previewBiology.colorId,
      },
      onCompleted: () => {
        onClose();
        toast({
          status: "success",
          title: `Saved layer ${itemLayer.id}: ${item.name}`,
        });
      },
    }
  );

  return (
    <Modal size="xl" isOpen={isOpen} onClose={onClose}>
      <ModalOverlay>
        <ModalContent color="green.800">
          <ModalHeader>
            Layer {itemLayer.id}: {item.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Metadata>
              <MetadataLabel>DTI ID:</MetadataLabel>
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
              selectedBodyId={selectedBodyId}
              previewBiology={previewBiology}
              onChangeBodyId={setSelectedBodyId}
              onChangePreviewBiology={setPreviewBiology}
            />
          </ModalBody>
          <ModalFooter>
            {mutationError && (
              <Box
                color="red.400"
                fontSize="sm"
                marginRight="2"
                textAlign="right"
              >
                {mutationError.message}
              </Box>
            )}
            <Button
              isLoading={mutationLoading}
              colorScheme="green"
              onClick={mutate}
            >
              Save changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
}

function ItemSupportAppearanceLayerPetCompatibility({
  item,
  itemLayer,
  outfitState,
  selectedBodyId,
  previewBiology,
  onChangeBodyId,
  onChangePreviewBiology,
}) {
  const [selectedBiology, setSelectedBiology] = React.useState(previewBiology);

  const {
    loading,
    error,
    visibleLayers,
    bodyId: appearanceBodyId,
  } = useOutfitAppearance({
    speciesId: previewBiology.speciesId,
    colorId: previewBiology.colorId,
    pose: previewBiology.pose,
    wornItemIds: [item.id],
  });

  const biologyLayers = visibleLayers.filter((l) => l.source === "pet");

  // When the appearance body ID changes, select it as the new body ID. (This
  // is an effect because it happens after the appearance finishes loading!)
  React.useEffect(() => {
    if (selectedBodyId !== "0") {
      onChangeBodyId(appearanceBodyId);
    }
  }, [selectedBodyId, appearanceBodyId, onChangeBodyId]);

  return (
    <FormControl isInvalid={error || !selectedBiology.isValid ? true : false}>
      <FormLabel>Pet compatibility</FormLabel>
      <RadioGroup
        colorScheme="green"
        value={selectedBodyId}
        onChange={(newBodyId) => onChangeBodyId(newBodyId)}
        marginBottom="4"
      >
        <Radio value="0">
          Fits all pets{" "}
          <Box display="inline" color="gray.400" fontSize="sm">
            (Body ID: 0)
          </Box>
        </Radio>
        <Radio as="div" value={appearanceBodyId} marginTop="2">
          Fits all pets with the same body as:{" "}
          <Box display="inline" color="gray.400" fontSize="sm">
            (Body ID:{" "}
            {appearanceBodyId == null ? (
              <Spinner size="sm" />
            ) : (
              appearanceBodyId
            )}
            )
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
          size="sm"
          showPlaceholders
          onChange={(species, color, isValid, pose) => {
            const speciesId = species.id;
            const colorId = color.id;

            setSelectedBiology({ speciesId, colorId, isValid, pose });
            if (isValid) {
              onChangePreviewBiology({ speciesId, colorId, isValid, pose });
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
