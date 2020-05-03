import React from "react";
import gql from "graphql-tag";
import useFetch from "use-http";
import { useQuery } from "@apollo/react-hooks";
import { Box, Flex, Select, Text, useToast } from "@chakra-ui/core";

import { Delay } from "./util";

/**
 * SpeciesColorPicker lets the user pick the species/color of their pet.
 *
 * It preloads all species, colors, and valid species/color pairs; and then
 * ensures that the outfit is always in a valid state.
 */
function SpeciesColorPicker({ outfitState, dispatchToOutfit }) {
  const toast = useToast();
  const { loading: loadingMeta, error: errorMeta, data: meta } = useQuery(gql`
    query {
      allSpecies {
        id
        name
      }

      allColors {
        id
        name
      }
    }
  `);
  const {
    loading: loadingValids,
    error: errorValids,
    data: validsBuffer,
  } = useFetch("/api/validPetPoses", { responseType: "arrayBuffer" }, []);
  const valids = React.useMemo(
    () => validsBuffer && new DataView(validsBuffer),
    [validsBuffer]
  );

  const allColors = (meta && [...meta.allColors]) || [];
  allColors.sort((a, b) => a.name.localeCompare(b.name));
  const allSpecies = (meta && [...meta.allSpecies]) || [];
  allSpecies.sort((a, b) => a.name.localeCompare(b.name));

  if (loadingMeta || loadingValids) {
    return (
      <Delay ms={5000}>
        <Text color="gray.50" textShadow="md">
          Loading species/color data…
        </Text>
      </Delay>
    );
  }

  if (errorMeta || errorValids) {
    return (
      <Text color="gray.50" textShadow="md">
        Error loading species/color data.
      </Text>
    );
  }

  // When the color changes, check if the new pair is valid, and update the
  // outfit if so!
  const onChangeColor = (e) => {
    const speciesId = outfitState.speciesId;
    const colorId = e.target.value;
    if (pairIsValid(valids, speciesId, colorId)) {
      dispatchToOutfit({ type: "changeColor", colorId: e.target.value });
    } else {
      const species = allSpecies.find((s) => s.id === speciesId);
      const color = allColors.find((c) => c.id === colorId);
      toast({
        title: `We haven't seen a ${color.name} ${species.name} before! 😓`,
        status: "warning",
      });
    }
  };

  // When the species changes, check if the new pair is valid, and update the
  // outfit if so!
  const onChangeSpecies = (e) => {
    const colorId = outfitState.colorId;
    const speciesId = e.target.value;
    if (pairIsValid(valids, speciesId, colorId)) {
      dispatchToOutfit({ type: "changeSpecies", speciesId: e.target.value });
    } else {
      const species = allSpecies.find((s) => s.id === speciesId);
      const color = allColors.find((c) => c.id === colorId);
      toast({
        title: `We haven't seen a ${color.name} ${species.name} before! 😓`,
        status: "warning",
      });
    }
  };

  return (
    <Flex direction="row">
      <Select
        aria-label="Pet color"
        value={outfitState.colorId}
        onChange={onChangeColor}
        backgroundColor="gray.600"
        color="gray.50"
        border="none"
        boxShadow="md"
        width="auto"
      >
        {allColors.map((color) => (
          <option key={color.id} value={color.id}>
            {color.name}
          </option>
        ))}
      </Select>
      <Box width="4" />
      <Select
        aria-label="Pet species"
        value={outfitState.speciesId}
        onChange={onChangeSpecies}
        backgroundColor="gray.600"
        color="gray.50"
        border="none"
        boxShadow="md"
        width="auto"
      >
        {allSpecies.map((species) => (
          <option key={species.id} value={species.id}>
            {species.name}
          </option>
        ))}
      </Select>
    </Flex>
  );
}

function pairIsValid(valids, speciesId, colorId) {
  // Reading a bit table, owo!
  const speciesIndex = speciesId - 1;
  const colorIndex = colorId - 1;
  const numColors = valids.getUint8(1);
  const pairByteIndex = speciesIndex * numColors + colorIndex + 2;
  const pairByte = valids.getUint8(pairByteIndex);
  return pairByte !== 0;
}

export default SpeciesColorPicker;
