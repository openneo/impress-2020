import React from "react";
import { css } from "emotion";
import gql from "graphql-tag";
import { Box, Button, Flex, Input, useTheme, useToast } from "@chakra-ui/core";
import { useHistory } from "react-router-dom";
import { useLazyQuery } from "@apollo/react-hooks";

import { Heading1, usePageTitle } from "./util";

import HomepageSplashImg from "../images/homepage-splash.png";
import SpeciesColorPicker from "./SpeciesColorPicker";

function HomePage() {
  usePageTitle("Dress to Impress");

  return (
    <Flex
      color="green.800"
      direction="column"
      p="6"
      align="center"
      textAlign="center"
    >
      <Box height="8" />
      <Box
        as="img"
        src={HomepageSplashImg}
        width="200px"
        height="200px"
        rounded="lg"
        boxShadow="md"
      />
      <Box height="4" />
      <Heading1>Dress to Impress</Heading1>
      <Box height="8" />
      <StartOutfitForm />
      <Box height="4" />
      <Box fontStyle="italic" fontSize="sm">
        or
      </Box>
      <Box height="4" />
      <SubmitPetForm />
    </Flex>
  );
}

function StartOutfitForm() {
  const history = useHistory();

  const [speciesId, setSpeciesId] = React.useState("1");
  const [colorId, setColorId] = React.useState("8");
  const [isValid, setIsValid] = React.useState(true);

  const onSubmit = (e) => {
    e.preventDefault();

    if (!isValid) {
      return;
    }

    const params = new URLSearchParams({
      species: speciesId,
      color: colorId,
    });

    history.push(`/outfits/new?${params}`);
  };

  return (
    <form onSubmit={onSubmit}>
      <Flex>
        <SpeciesColorPicker
          speciesId={speciesId}
          colorId={colorId}
          showPlaceholders
          onChange={(species, color, isValid) => {
            setSpeciesId(species.id);
            setColorId(color.id);
            setIsValid(isValid);
          }}
        />
        <Box width="4" />
        <Button type="submit" variantColor="green" disabled={!isValid}>
          Start
        </Button>
      </Flex>
    </form>
  );
}

function SubmitPetForm() {
  const history = useHistory();
  const theme = useTheme();
  const toast = useToast();

  const [petName, setPetName] = React.useState("");

  const [loadPet, { loading }] = useLazyQuery(
    gql`
      query($petName: String!) {
        petOnNeopetsDotCom(petName: $petName) {
          color {
            id
          }
          species {
            id
          }
          items {
            id
          }
        }
      }
    `,
    {
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        if (!data) return;

        const { species, color, items } = data.petOnNeopetsDotCom;
        const params = new URLSearchParams({
          name: petName,
          species: species.id,
          color: color.id,
          emotion: "HAPPY", // TODO: Ask PetService
          genderPresentation: "FEMININE", // TODO: Ask PetService
        });
        for (const item of items) {
          params.append("objects[]", item.id);
        }
        history.push(`/outfits/new?${params}`);
      },
      onError: () => {
        toast({
          title: "We couldn't load that pet, sorry 😓",
          description: "Is it spelled correctly?",
          status: "error",
        });
      },
    }
  );

  const onSubmit = (e) => {
    e.preventDefault();

    loadPet({ variables: { petName } });

    // Start preloading the WardrobePage, too!
    // eslint-disable-next-line no-unused-expressions
    import("./WardrobePage");
  };

  return (
    <form onSubmit={onSubmit}>
      <Flex>
        <Input
          value={petName}
          onChange={(e) => setPetName(e.target.value)}
          isDisabled={loading}
          placeholder="Enter a pet's name"
          borderColor="green.600"
          _hover={{ borderColor: "green.400" }}
          boxShadow="md"
          width="14em"
          className={css`
            &::placeholder {
              color: ${theme.colors.gray["500"]};
            }
          `}
        />
        <Box width="4" />
        <Button
          type="submit"
          variantColor="green"
          isDisabled={!petName}
          isLoading={loading}
        >
          Start
        </Button>
      </Flex>
    </form>
  );
}

export default HomePage;
