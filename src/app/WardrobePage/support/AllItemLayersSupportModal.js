import React from "react";
import {
  Box,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { gql, useQuery } from "@apollo/client";
import {
  itemAppearanceFragment,
  petAppearanceFragment,
} from "../../components/useOutfitAppearance";
import HangerSpinner from "../../components/HangerSpinner";
import { ErrorMessage, useCommonStyles } from "../../util";
import ItemSupportAppearanceLayer from "./ItemSupportAppearanceLayer";

function AllItemLayersSupportModal({ item, isOpen, onClose }) {
  const { bodyBackground } = useCommonStyles();

  return (
    <Modal size="4xl" isOpen={isOpen} onClose={onClose}>
      <ModalOverlay>
        <ModalContent background={bodyBackground}>
          <ModalHeader as="h1">
            <Box as="span" fontWeight="700">
              Layers on all pets:
            </Box>{" "}
            <Box as="span" fontWeight="normal">
              {item.name}
            </Box>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody paddingBottom="12">
            <AllItemLayersSupportModalContent item={item} />
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
}

function AllItemLayersSupportModalContent({ item }) {
  const { loading, error, data } = useQuery(
    gql`
      query AllItemLayersSupportModal($itemId: ID!) {
        item(id: $itemId) {
          id
          allAppearances {
            id
            body {
              id
              representsAllBodies
              canonicalAppearance {
                id
                species {
                  id
                  name
                }
                color {
                  id
                  name
                  isStandard
                }
                pose
                ...PetAppearanceForOutfitPreview
              }
            }
            ...ItemAppearanceForOutfitPreview
          }
        }
      }

      ${itemAppearanceFragment}
      ${petAppearanceFragment}
    `,
    { variables: { itemId: item.id } }
  );

  if (loading) {
    return (
      <Flex align="center" justify="center" minHeight="64">
        <HangerSpinner />
      </Flex>
    );
  }

  if (error) {
    return <ErrorMessage>{error.message}</ErrorMessage>;
  }

  const itemAppearances = [...(data.item?.allAppearances || [])].sort(
    (a, b) => {
      const aKey = getSortKeyForPetAppearance(a.body.canonicalAppearance);
      const bKey = getSortKeyForPetAppearance(b.body.canonicalAppearance);
      return aKey.localeCompare(bKey);
    }
  );

  return (
    <Wrap justify="center" spacing="4">
      {itemAppearances.map((itemAppearance) => (
        <WrapItem key={itemAppearance.id}>
          <ItemAppearanceCard item={item} itemAppearance={itemAppearance} />
        </WrapItem>
      ))}
    </Wrap>
  );
}

function ItemAppearanceCard({ item, itemAppearance }) {
  const petAppearance = itemAppearance.body.canonicalAppearance;
  const biologyLayers = petAppearance.layers;
  const itemLayers = [...itemAppearance.layers].sort(
    (a, b) => a.zone.depth - b.zone.depth
  );

  const { brightBackground } = useCommonStyles();

  return (
    <Box
      background={brightBackground}
      paddingX="4"
      paddingY="3"
      boxShadow="lg"
      borderRadius="lg"
    >
      <Heading as="h2" size="sm" fontWeight="600">
        {getBodyName(itemAppearance.body)}
      </Heading>
      <Box height="3" />
      <Wrap paddingX="3" spacing="5">
        {itemLayers.map((itemLayer) => (
          <WrapItem key={itemLayer.id}>
            <ItemSupportAppearanceLayer
              item={item}
              itemLayer={itemLayer}
              biologyLayers={biologyLayers}
              outfitState={{
                speciesId: petAppearance.species.id,
                colorId: petAppearance.color.id,
                pose: petAppearance.pose,
              }}
            />
          </WrapItem>
        ))}
      </Wrap>
    </Box>
  );
}

function getSortKeyForPetAppearance({ color, species }) {
  // Sort standard colors first, then special colors by name, then by species
  // within each color.
  return `${color.isStandard ? "A" : "Z"}-${color.name}-${species.name}`;
}

function getBodyName(body) {
  if (body.representsAllBodies) {
    return "All bodies";
  }

  const { species, color } = body.canonicalAppearance;
  const speciesName = capitalize(species.name);
  const colorName = color.isStandard ? "Standard" : capitalize(color.name);
  return `${colorName} ${speciesName}`;
}

function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

export default AllItemLayersSupportModal;
