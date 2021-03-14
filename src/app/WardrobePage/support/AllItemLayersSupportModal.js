import React from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Tooltip,
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
import { EditIcon } from "@chakra-ui/icons";
import cachedZones from "../../cached-data/zones.json";

function AllItemLayersSupportModal({ item, isOpen, onClose }) {
  const [bulkAddProposal, setBulkAddProposal] = React.useState(null);

  const { bodyBackground } = useCommonStyles();

  return (
    <Modal size="4xl" isOpen={isOpen} onClose={onClose}>
      <ModalOverlay>
        <ModalContent background={bodyBackground}>
          <ModalHeader as="h1" paddingBottom="2">
            <Box as="span" fontWeight="700">
              Layers on all pets:
            </Box>{" "}
            <Box as="span" fontWeight="normal">
              {item.name}
            </Box>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody paddingBottom="12">
            <BulkAddBodySpecificAssetsForm onSubmit={setBulkAddProposal} />
            <Box height="8" />
            {bulkAddProposal ? (
              <>
                TODO: Show assets {bulkAddProposal.minAssetId}–
                {Number(bulkAddProposal.minAssetId) + 53}, tenatively applied to
                zone {bulkAddProposal.zoneId}
              </>
            ) : (
              ""
            )}
            <Box height="8" />
            <AllItemLayersSupportModalContent item={item} />
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
}

function BulkAddBodySpecificAssetsForm({ onSubmit }) {
  const zones = [...cachedZones].sort((a, b) =>
    `${a.label}-${a.id}`.localeCompare(`${b.label}-${b.id}`)
  );

  const [minAssetId, setMinAssetId] = React.useState(null);
  const [zoneId, setZoneId] = React.useState(zones[0].id);

  return (
    <Flex
      align="center"
      as="form"
      fontSize="sm"
      opacity="0.9"
      transition="0.2s all"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ minAssetId, zoneId });
      }}
    >
      <Tooltip
        label={
          <Box textAlign="center" fontSize="xs">
            <Box as="p" marginBottom="1em">
              When an item accidentally gets assigned to fit all bodies, this
              tool can help you recover the original appearances, by assuming
              the layer IDs are assigned to each species in alphabetical order.
            </Box>
            <Box as="p">
              This will only find layers that have already been modeled!
            </Box>
          </Box>
        }
      >
        <Flex align="center" tabIndex="0">
          <EditIcon marginRight="1" />
          <Box>Bulk-add body-specific assets:</Box>
        </Flex>
      </Tooltip>
      <Box width="2" />
      <Input
        type="number"
        min="1"
        step="1"
        size="xs"
        width="9ch"
        placeholder="Min ID"
        value={minAssetId || ""}
        onChange={(e) => setMinAssetId(e.target.value || null)}
      />
      <Box width="1" />
      <Box>–</Box>
      <Box width="1" />
      <Input
        type="number"
        min="54"
        step="1"
        size="xs"
        width="9ch"
        placeholder="Max ID"
        // There are 54 species at time of writing, so offsetting the max ID
        // by 53 gives us ranges like 1–54, one for each species.
        value={minAssetId != null ? Number(minAssetId) + 53 : ""}
        onChange={(e) =>
          setMinAssetId(e.target.value ? Number(e.target.value) - 53 : null)
        }
      />
      <Box width="1" />
      <Box>, assigned to </Box>
      <Box width="2" />
      <Select
        size="xs"
        width="20ch"
        value={zoneId}
        onChange={(e) => setZoneId(e.target.value)}
      >
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.label} (Zone {zone.id})
          </option>
        ))}
      </Select>
      <Box width="2" />
      <Button type="submit" size="xs" isDisabled={minAssetId == null}>
        Preview
      </Button>
    </Flex>
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
