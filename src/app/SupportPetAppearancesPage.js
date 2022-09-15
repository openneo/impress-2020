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
import HangerSpinner from "./components/HangerSpinner";
import { ErrorMessage, Heading1 } from "./util";
import useSupport from "./WardrobePage/support/useSupport";
import Link from "next/link";

function SupportPetAppearancesPage() {
  const { isSupportUser } = useSupport();

  if (!isSupportUser) {
    return <Box>Sorry, this page is only for Support users!</Box>;
  }

  return (
    <Box>
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
              mood/gender-presentation poses. Sorted newest to oldest.
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Box>
      <UnlabeledPetAppearancesList />
    </Box>
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

  // Sort the pairs from newest to oldest, taking advantage of our knowledge
  // that the IDs are numbers that increase over time. (A bit hacky, a real
  // timestamp would be better, but we never stored those oops!)
  const speciesColorPairs = [
    ...data.speciesColorPairsThatNeedSupportLabeling,
  ].sort((a, b) => Number(b.id) - Number(a.id));

  if (speciesColorPairs.length === 0) {
    return <>…never mind, they're all done! Wow, go team!! 🎉</>;
  }

  return (
    <Wrap align="center">
      {speciesColorPairs.map(({ id, species, color }) => (
        <WrapItem key={id}>
          <SpeciesColorEditorLink species={species} color={color} />
        </WrapItem>
      ))}
      <WrapItem>
        {speciesColorPairs.length >= 10 && (
          <Box fontSize="xs" fontStyle="italic" marginLeft="2">
            (That's {speciesColorPairs.length} total, and fewer by the minute!)
          </Box>
        )}
      </WrapItem>
    </Wrap>
  );
}

function SpeciesColorEditorLink({ species, color }) {
  const hoverBackgroundColor = useColorModeValue(
    "blackAlpha.50",
    "whiteAlpha.100"
  );

  return (
    <Link
      href={`/outfits/new?species=${species.id}&color=${color.id}&pose=UNKNOWN`}
      passHref
    >
      <Box
        as="a"
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
    </Link>
  );
}

export default SupportPetAppearancesPage;
