import { gql, useQuery } from "@apollo/client";
import { Box, Flex, Wrap, WrapItem } from "@chakra-ui/layout";
import { Link } from "react-router-dom";
import HangerSpinner from "./components/HangerSpinner";
import {
  getValidPoses,
  useAllValidPetPoses,
} from "./components/SpeciesColorPicker";
import { ErrorMessage, Heading1 } from "./util";
import useSupport from "./WardrobePage/support/useSupport";

function SupportPetAppearancesPage() {
  const { isSupportUser } = useSupport();

  if (!isSupportUser) {
    return "Sorry, this page is only for Support users!";
  }

  return (
    <>
      <Heading1 marginBottom=".5em">Support: Pet appearances</Heading1>
      <UnlabeledPetAppearancesList />
    </>
  );
}

function UnlabeledPetAppearancesList() {
  const { loading, error, speciesColorPairs } = useUnlabeledPetAppearances();

  return (
    <Box>
      <Box as="p" marginBottom="2">
        These pet appearances have some <code>UNKNOWN</code> poses that need
        labeled! Please take a look!
      </Box>
      {loading && (
        <Flex justify="center">
          <HangerSpinner />
        </Flex>
      )}
      {error && <ErrorMessage>{error.message}</ErrorMessage>}
      {speciesColorPairs.length > 0 && (
        <Wrap>
          {speciesColorPairs.map(({ species, color }) => (
            <WrapItem key={`${species.id}-${color.id}`}>
              <SpeciesColorEditorLink species={species} color={color} />
            </WrapItem>
          ))}
        </Wrap>
      )}
    </Box>
  );
}

function SpeciesColorEditorLink({ species, color }) {
  return (
    <Box
      as={Link}
      to={`/outfits/new?species=${species.id}&color=${color.id}`}
      target="supportPetAppearanceEditor"
      border="1px solid"
      borderColor="green.600"
      borderRadius="full"
      paddingX="3"
      paddingY="2"
      fontSize="sm"
    >
      {color.name} {species.name}
    </Box>
  );
}

function useUnlabeledPetAppearances() {
  const {
    loading: loadingValids,
    error: errorValids,
    valids,
  } = useAllValidPetPoses({ headers: { "Cache-Control": "no-cache" } });
  const { loading: loadingGQL, error: errorGQL, data } = useQuery(gql`
    query SupportUnlabeledPetAppearances {
      allColors {
        id
        name
      }

      allSpecies {
        id
        name
      }
    }
  `);

  const loading = loadingValids || loadingGQL;
  const error = errorValids || errorGQL;
  const speciesColorPairs =
    valids && data?.allColors && data?.allSpecies
      ? data?.allSpecies
          .map((species) => data.allColors.map((color) => ({ species, color })))
          .flat()
          .filter(({ species, color }) => {
            const poses = getValidPoses(valids, species.id, color.id);
            const hasAllStandardPoses =
              poses.has("HAPPY_MASC") &&
              poses.has("HAPPY_FEM") &&
              poses.has("SAD_MASC") &&
              poses.has("SAD_FEM") &&
              poses.has("SICK_MASC") &&
              poses.has("SICK_FEM");
            const hasAtLeastOneUnknownPose = poses.has("UNKNOWN");
            return !hasAllStandardPoses && hasAtLeastOneUnknownPose;
          })
          .sort((a, b) =>
            `${a.species.name} ${a.color.name}`.localeCompare(
              `${b.species.name} ${b.color.name}`
            )
          )
      : [];

  return {
    loading,
    error,
    speciesColorPairs,
  };
}

export default SupportPetAppearancesPage;
