import React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { Box, Flex, Select, Text } from "@chakra-ui/core";

import { Delay, useFetch } from "../util";

/**
 * SpeciesColorPicker lets the user pick the species/color of their pet.
 *
 * It preloads all species, colors, and valid species/color pairs; and then
 * ensures that the outfit is always in a valid state.
 */
function SpeciesColorPicker({
  speciesId,
  colorId,
  idealPose,
  showPlaceholders = false,
  isDisabled = false,
  size = "md",
  dark = false,
  onChange,
}) {
  const { loading: loadingMeta, error: errorMeta, data: meta } = useQuery(gql`
    query SpeciesColorPicker {
      allSpecies {
        id
        name
      }

      allColors {
        id
        name
        isStandard # Not used here, but helpful for caching!
      }
    }
  `);
  const {
    loading: loadingValids,
    error: errorValids,
    data: validsBuffer,
  } = useFetch("/api/validPetPoses", { responseType: "arrayBuffer" });
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
  const SpeciesColorSelect = ({ isDisabled, isLoading, ...props }) => {
    const loadingProps = isLoading
      ? {
          // Visually the disabled state is the same as the normal state, but
          // with a wait cursor. We don't expect this to take long, and the flash
          // of content is rough! (The caret still flashes, but that's small and
          // harder to style in Chakra.)
          opacity: 1,
          cursor: "wait",
        }
      : {};

    return (
      <Select
        backgroundColor={backgroundColor}
        color={textColor}
        size={size}
        border="1px"
        borderColor={borderColor}
        boxShadow="md"
        width="auto"
        _hover={{
          borderColor: "green.400",
        }}
        isInvalid={valids && !pairIsValid(valids, speciesId, colorId)}
        isDisabled={isDisabled || isLoading}
        errorBorderColor="red.300"
        {...props}
        {...loadingProps}
      />
    );
  };

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
    const validPoses = getValidPoses(valids, speciesId, newColorId);
    const isValid = validPoses.size > 0;
    const closestPose = getClosestPose(validPoses, idealPose);
    onChange(species, newColor, isValid, closestPose);
  };

  // When the species changes, check if the new pair is valid, and update the
  // outfit if so!
  const onChangeSpecies = (e) => {
    const newSpeciesId = e.target.value;

    const newSpecies = allSpecies.find((s) => s.id === newSpeciesId);
    const color = allColors.find((c) => c.id === colorId);
    const validPoses = getValidPoses(valids, newSpeciesId, colorId);
    const isValid = validPoses.size > 0;
    const closestPose = getClosestPose(validPoses, idealPose);
    onChange(newSpecies, color, isValid, closestPose);
  };

  return (
    <Flex direction="row">
      <SpeciesColorSelect
        aria-label="Pet color"
        value={colorId}
        isLoading={allColors.length === 0}
        isDisabled={isDisabled}
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
      <Box width={size === "sm" ? 2 : 4} />
      <SpeciesColorSelect
        aria-label="Pet species"
        value={speciesId}
        isLoading={allSpecies.length === 0}
        isDisabled={isDisabled}
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

function getPairByte(valids, speciesId, colorId) {
  // Reading a bit table, owo!
  const speciesIndex = speciesId - 1;
  const colorIndex = colorId - 1;
  const numColors = valids.getUint8(1);
  const pairByteIndex = speciesIndex * numColors + colorIndex + 2;
  return valids.getUint8(pairByteIndex);
}

function pairIsValid(valids, speciesId, colorId) {
  return getPairByte(valids, speciesId, colorId) !== 0;
}

function getValidPoses(valids, speciesId, colorId) {
  const pairByte = getPairByte(valids, speciesId, colorId);

  const validPoses = new Set();
  if (pairByte & 0b00000001) validPoses.add("HAPPY_MASC");
  if (pairByte & 0b00000010) validPoses.add("SAD_MASC");
  if (pairByte & 0b00000100) validPoses.add("SICK_MASC");
  if (pairByte & 0b00001000) validPoses.add("HAPPY_FEM");
  if (pairByte & 0b00010000) validPoses.add("SAD_FEM");
  if (pairByte & 0b00100000) validPoses.add("SICK_FEM");
  // TODO: Add unconverted support!
  // if (pairByte & 0b01000000) validPoses.add("UNCONVERTED");
  if (pairByte & 0b10000000) validPoses.add("UNKNOWN");

  return validPoses;
}

function getClosestPose(validPoses, idealPose) {
  return closestPosesInOrder[idealPose].find((p) => validPoses.has(p)) || null;
}

// For each pose, in what order do we prefer to match other poses?
//
// The principles of this ordering are:
//   - Happy/sad matters more than gender presentation.
//   - "Sick" is an unpopular emotion, and it's better to change gender
//     presentation and stay happy/sad than to become sick.
//   - Sad is a better fallback for sick than happy.
//   - Unconverted vs converted is the biggest possible difference.
//   - Unknown is the pose of last resort - even coming from another unknown.
const closestPosesInOrder = {
  HAPPY_MASC: [
    "HAPPY_MASC",
    "HAPPY_FEM",
    "SAD_MASC",
    "SAD_FEM",
    "SICK_MASC",
    "SICK_FEM",
    "UNCONVERTED",
    "UNKNOWN",
  ],
  HAPPY_FEM: [
    "HAPPY_FEM",
    "HAPPY_MASC",
    "SAD_FEM",
    "SAD_MASC",
    "SICK_FEM",
    "SICK_MASC",
    "UNCONVERTED",
    "UNKNOWN",
  ],
  SAD_MASC: [
    "SAD_MASC",
    "SAD_FEM",
    "HAPPY_MASC",
    "HAPPY_FEM",
    "SICK_MASC",
    "SICK_FEM",
    "UNCONVERTED",
    "UNKNOWN",
  ],
  SAD_FEM: [
    "SAD_FEM",
    "SAD_MASC",
    "HAPPY_FEM",
    "HAPPY_MASC",
    "SICK_FEM",
    "SICK_MASC",
    "UNCONVERTED",
    "UNKNOWN",
  ],
  SICK_MASC: [
    "SICK_MASC",
    "SICK_FEM",
    "SAD_MASC",
    "SAD_FEM",
    "HAPPY_MASC",
    "HAPPY_FEM",
    "UNCONVERTED",
    "UNKNOWN",
  ],
  SICK_FEM: [
    "SICK_FEM",
    "SICK_MASC",
    "SAD_FEM",
    "SAD_MASC",
    "HAPPY_FEM",
    "HAPPY_MASC",
    "UNCONVERTED",
    "UNKNOWN",
  ],
  UNCONVERTED: [
    "UNCONVERTED",
    "HAPPY_FEM",
    "HAPPY_MASC",
    "SAD_FEM",
    "SAD_MASC",
    "SICK_FEM",
    "SICK_MASC",
    "UNKNOWN",
  ],
  UNKNOWN: [
    "HAPPY_FEM",
    "HAPPY_MASC",
    "SAD_FEM",
    "SAD_MASC",
    "SICK_FEM",
    "SICK_MASC",
    "UNCONVERTED",
    "UNKNOWN",
  ],
};

export default SpeciesColorPicker;
