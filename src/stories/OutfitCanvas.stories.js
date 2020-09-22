import React from "react";

import OutfitCanvas, {
  OutfitCanvasImage,
  OutfitCanvasMovie,
} from "../app/components/OutfitCanvas";

export default {
  title: "Dress to Impress/OutfitCanvas",
  component: OutfitCanvas,
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
        options: ["Bubbles In Water Foreground"],
      },
    },
  },
};

// NOTE: We don't bother with assetProxy here, because we only run Storybook
//       locally, and localhost isn't subject to the same mixed content rules.
//       So this is noticeably faster!

const Template = (args) => (
  <OutfitCanvas width={300} height={300} pauseMovieLayers={args.paused}>
    {args.pet === "Blue Acara" && (
      <>
        <OutfitCanvasImage
          src="http://images.neopets.com/cp/bio/data/000/000/002/2426_898928db88/2426.svg"
          zIndex={10}
        />
        <OutfitCanvasImage
          src="http://images.neopets.com/cp/bio/data/000/000/002/2425_501f596cef/2425.svg"
          zIndex={20}
        />
        <OutfitCanvasImage
          src="http://images.neopets.com/cp/bio/data/000/000/002/2427_f12853f18a/2427.svg"
          zIndex={30}
        />
        <OutfitCanvasImage
          src="http://images.neopets.com/cp/bio/data/000/000/032/32185_dc8f076ae3/32185.svg"
          zIndex={40}
        />
        <OutfitCanvasImage
          src="http://images.neopets.com/cp/bio/data/000/000/002/2428_991dcdedc7/2428.svg"
          zIndex={50}
        />
        <OutfitCanvasImage
          src="http://images.neopets.com/cp/bio/data/000/000/002/2430_87edccba4c/2430.svg"
          zIndex={60}
        />
      </>
    )}
    {args.items.includes("Bubbles In Water Foreground") && (
      <OutfitCanvasMovie
        librarySrc="http://images.neopets.com/cp/items/data/000/000/564/564507_fc3216b9b8/all-item_foreground_lower.js"
        zIndex={100}
      />
    )}
  </OutfitCanvas>
);

export const BlueAcara = Template.bind({});
BlueAcara.args = {
  pet: "Blue Acara",
  items: [],
  paused: false,
};

export const BubblesOnWaterForeground = Template.bind({});
BubblesOnWaterForeground.args = {
  pet: "None",
  items: ["Bubbles In Water Foreground"],
  paused: false,
};

export const BlueAcaraWithForeground = Template.bind({});
BlueAcaraWithForeground.args = {
  pet: "Blue Acara",
  items: ["Bubbles In Water Foreground"],
  paused: false,
};
