import { gql, useQuery } from "@apollo/client";
import { useColorModeValue } from "@chakra-ui/color-mode";
import { QuestionIcon } from "@chakra-ui/icons";
import { Box, Flex, Wrap, WrapItem } from "@chakra-ui/layout";
import {
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
} from "@chakra-ui/popover";
import { Link } from "react-router-dom";
import HangerSpinner from "./components/HangerSpinner";
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
      <Box as="p" marginBottom="2">
        These species/color combinations have some <code>UNKNOWN</code>{" "}
        appearances that need labeled! Please take a look!
        <Popover trigger="hover" placement="top">
          <PopoverTrigger>
            <QuestionIcon marginLeft="1.5" marginTop="-2px" tabIndex="0" />
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverBody fontSize="sm" textAlign="center">
              This includes species/color combinations that have at least one{" "}
              non-glitched <code>UNKNOWN</code> pose, and still need a
              non-glitched version of at least one of the standard 6
              mood/gender-presentation poses.
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Box>
      <UnlabeledPetAppearancesList />
    </>
  );
}

function UnlabeledPetAppearancesList() {
  const { loading, error, data } = useQuery(gql`
    query SupportUnlabeledSpeciesColorPairs {
      speciesColorPairsThatNeedSupportLabeling {
        id
        species {
          id
          name
        }
        color {
          id
          name
        }
      }
    }
  `);

  if (loading) {
    return (
      <Flex justify="center">
        <HangerSpinner />
      </Flex>
    );
  }

  if (error) {
    return <ErrorMessage>{error.message}</ErrorMessage>;
  }

  const speciesColorPairs = [
    ...data.speciesColorPairsThatNeedSupportLabeling,
  ].sort((a, b) =>
    `${a.species.name} ${a.color.name}`.localeCompare(
      `${b.species.name} ${b.color.name}`
    )
  );

  if (speciesColorPairs.length === 0) {
    return <>…never mind, they're all done! Wow, go team!! 🎉</>;
  }

  return (
    <Wrap>
      {speciesColorPairs.map(({ species, color }) => (
        <WrapItem key={`${species.id}-${color.id}`}>
          <SpeciesColorEditorLink species={species} color={color} />
        </WrapItem>
      ))}
    </Wrap>
  );
}

function SpeciesColorEditorLink({ species, color }) {
  const hoverBackgroundColor = useColorModeValue(
    "blackAlpha.50",
    "whiteAlpha.100"
  );

  return (
    <Box
      as={Link}
      to={`/outfits/new?species=${species.id}&color=${color.id}&pose=UNKNOWN`}
      target="supportPetAppearanceEditor"
      border="1px solid"
      borderColor="green.600"
      borderRadius="full"
      paddingX="3"
      paddingY="2"
      fontSize="sm"
      _hover={{ backgroundColor: hoverBackgroundColor }}
      _focus={{ boxShadow: "outline", outline: "none" }}
    >
      {color.name} {species.name}
    </Box>
  );
}

export default SupportPetAppearancesPage;
