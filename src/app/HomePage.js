import React from "react";
import { Box, Flex, Button, Tooltip } from "@chakra-ui/core";
import { useHistory } from "react-router-dom";

import { Heading1 } from "./util";

import HomepageSplashImg from "../images/homepage-splash.png";
import SpeciesColorPicker from "./SpeciesColorPicker";

function HomePage() {
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
    </Flex>
  );
}

function StartOutfitForm() {
  const history = useHistory();

  const [speciesId, setSpeciesId] = React.useState("1");
  const [colorId, setColorId] = React.useState("8");
  const [isValid, setIsValid] = React.useState(true);

  const onSubmit = () => {
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
        <Tooltip
          label="Does not exist 😓"
          placement="top"
          // HACK: I only want the tooltip to appear when invalid... but the
          //       API doesn't really give us that option while also retaining
          //       the same <Button> instance. Instead, we set the max delay ><
          showDelay={isValid && 2147483647}
        >
          <Button type="submit" variantColor="green" disabled={!isValid}>
            Start
          </Button>
        </Tooltip>
      </Flex>
    </form>
  );
}

export default HomePage;
