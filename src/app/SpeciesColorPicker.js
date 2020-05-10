import React from "react";
import gql from "graphql-tag";
import useFetch from "use-http";
import { useQuery } from "@apollo/react-hooks";
import { Box, Flex, Select, Text } from "@chakra-ui/core";

import { Delay } from "./util";

/**
 * SpeciesColorPicker lets the user pick the species/color of their pet.
 *
 * It preloads all species, colors, and valid species/color pairs; and then
 * ensures that the outfit is always in a valid state.
 */
function SpeciesColorPicker({
  speciesId,
  colorId,
  showPlaceholders,
  dark = false,
  onChange,
}) {
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

  const backgroundColor = dark ? "gray.600" : "white";
  const borderColor = dark ? "transparent" : "green.600";
  const textColor = dark ? "gray.50" : "inherit";
  const SpeciesColorSelect = ({ ...props }) => (
    <Select
      backgroundColor={backgroundColor}
      color={textColor}
      border="1px"
      borderColor={borderColor}
      boxShadow="md"
      width="auto"
      _hover={{
        borderColor: "green.400",
      }}
      {...props}
    />
  );

  if ((loadingMeta || loadingValids) && !showPlaceholders) {
    return (
      <Delay ms={5000}>
        <Text color={textColor} textShadow="md">
          Loading species/color data…
        </Text>
      </Delay>
    );
  }

  if (errorMeta || errorValids) {
    return (
      <Text color={textColor} textShadow="md">
        Error loading species/color data.
      </Text>
    );
  }

  // When the color changes, check if the new pair is valid, and update the
  // outfit if so!
  const onChangeColor = (e) => {
    const newColorId = e.target.value;

    const species = allSpecies.find((s) => s.id === speciesId);
    const newColor = allColors.find((c) => c.id === newColorId);
    onChange(species, newColor, pairIsValid(valids, speciesId, newColorId));
  };

  // When the species changes, check if the new pair is valid, and update the
  // outfit if so!
  const onChangeSpecies = (e) => {
    const newSpeciesId = e.target.value;

    const newSpecies = allSpecies.find((s) => s.id === newSpeciesId);
    const color = allColors.find((c) => c.id === colorId);
    onChange(newSpecies, color, pairIsValid(valids, newSpeciesId, colorId));
  };

  return (
    <Flex direction="row">
      <SpeciesColorSelect
        aria-label="Pet color"
        value={colorId}
        isDisabled={allColors.length === 0}
        onChange={onChangeColor}
      >
        {allColors.length === 0 && (
          <>
            {/* The default case, and a long name for sizing! */}
            <option>Blue</option>
            <option>Dimensional</option>
          </>
        )}
        {allColors.map((color) => (
          <option key={color.id} value={color.id}>
            {color.name}
          </option>
        ))}
      </SpeciesColorSelect>
      <Box width="4" />
      <SpeciesColorSelect
        aria-label="Pet species"
        value={speciesId}
        isDisabled={allSpecies.length === 0}
        onChange={onChangeSpecies}
      >
        {allSpecies.length === 0 && (
          <>
            {/* The default case, and a long name for sizing! */}
            <option>Acara</option>
            <option>Tuskaninny</option>
          </>
        )}
        {allSpecies.map((species) => (
          <option key={species.id} value={species.id}>
            {species.name}
          </option>
        ))}
      </SpeciesColorSelect>
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
