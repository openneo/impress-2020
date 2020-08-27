import React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { Box, Select, Switch } from "@chakra-ui/core";

import { petAppearanceFragment } from "../../components/useOutfitAppearance";
import HangerSpinner from "../../components/HangerSpinner";

function PosePickerSupport({ speciesId, colorId }) {
  const { loading, error, data } = useQuery(
    gql`
      query PosePickerSupport($speciesId: ID!, $colorId: ID!) {
        petAppearances(speciesId: $speciesId, colorId: $colorId) {
          id
          petStateId
          bodyId
          pose
          ...PetAppearanceForOutfitPreview
        }
      }
      ${petAppearanceFragment}
    `,
    { variables: { speciesId, colorId } }
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <HangerSpinner boxSize="32px" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box color="red.400" marginTop="8">
        {error.message}
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end">
        <Select size="sm" width="auto">
          {data.petAppearances.map((pa) => (
            <option key={pa.petStateId}>
              {POSE_NAMES[pa.pose]} ({pa.petStateId})
            </option>
          ))}
        </Select>
      </Box>
    </Box>
  );
}

export function PosePickerSupportSwitch({ isChecked, onChange }) {
  return (
    <Box as="label" display="flex" flexDirection="row" alignItems="center">
      <Box fontSize="sm">
        <span role="img" aria-label="Support">
          💖
        </span>
      </Box>
      <Switch
        colorScheme="pink"
        marginLeft="1"
        size="sm"
        isChecked={isChecked}
        onChange={onChange}
      />
    </Box>
  );
}

const POSE_NAMES = {
  HAPPY_MASC: "Happy Masc",
  SAD_MASC: "Sad Masc",
  SICK_MASC: "Sick Masc",
  HAPPY_FEM: "Happy Fem",
  SAD_FEM: "Sad Fem",
  SICK_FEM: "Sick Fem",
  UNCONVERTED: "Unconverted",
  UNKNOWN: "Unknown",
};

export default PosePickerSupport;
