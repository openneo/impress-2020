import React from "react";
import { Box } from "@chakra-ui/core";

import { OutfitLayers } from "../app/components/OutfitPreview";

export default {
  title: "Dress to Impress/OutfitLayers",
  component: OutfitLayers,
  argTypes: {
    paused: {
      name: "Paused",
    },
    pet: {
      name: "Pet",
      control: {
        type: "radio",
        options: ["None", "Blue Acara"],
      },
    },
    items: {
      name: "Items",
      control: {
        type: "multi-select",
        options: ["Bubbles On Water Foreground"],
      },
    },
  },
};

const Template = (args) => {
  const layers = [];

  if (args.pet === "Blue Acara") {
    layers.push(...LAYERS.BlueAcara);
  }

  if (args.items.includes("Bubbles On Water Foreground")) {
    layers.push(...LAYERS.BubblesOnWaterForeground);
  }

  return (
    <Box width="100%" position="relative">
      <Box paddingBottom="100%" />
      <Box position="absolute" top="0" left="0" right="0" bottom="0">
        <OutfitLayers visibleLayers={layers} isPaused={args.paused} />
      </Box>
    </Box>
  );
};

export const BlueAcara = Template.bind({});
BlueAcara.args = {
  pet: "Blue Acara",
  items: [],
  paused: false,
};

export const BubblesOnWaterForeground = Template.bind({});
BubblesOnWaterForeground.args = {
  pet: "None",
  items: ["Bubbles On Water Foreground"],
  paused: false,
};

const LAYERS = {
  BlueAcara: [
    {
      id: "1795",
      svgUrl:
        "http://images.neopets.com/cp/bio/data/000/000/002/2426_898928db88/2426.svg",
      zone: { id: "5", depth: 7 },
    },
    {
      id: "1794",
      svgUrl:
        "http://images.neopets.com/cp/bio/data/000/000/002/2425_501f596cef/2425.svg",
      zone: { id: "15", depth: 18 },
    },
    {
      id: "22101",
      svgUrl:
        "http://images.neopets.com/cp/bio/data/000/000/032/32185_dc8f076ae3/32185.svg",
      zone: { id: "30", depth: 34 },
    },
    {
      id: "1797",
      svgUrl:
        "http://images.neopets.com/cp/bio/data/000/000/002/2428_991dcdedc7/2428.svg",
      zone: { id: "33", depth: 37 },
    },
    {
      id: "1798",
      svgUrl:
        "http://images.neopets.com/cp/bio/data/000/000/002/2430_87edccba4c/2430.svg",
      zone: { id: "34", depth: 38 },
    },
    {
      id: "1796",
      svgUrl:
        "http://images.neopets.com/cp/bio/data/000/000/002/2427_f12853f18a/2427.svg",
      zone: { id: "38", depth: 42 },
    },
  ],

  BubblesOnWaterForeground: [
    {
      id: "468155",
      canvasMovieLibraryUrl:
        "http://images.neopets.com/cp/items/data/000/000/564/564507_fc3216b9b8/all-item_foreground_lower.js",
      zone: { id: "45", depth: 50 },
    },
  ],
};
