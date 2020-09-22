import React from "react";

import EaselCanvas, { EaselBitmap } from "../app/components/EaselCanvas";

export default {
  title: "Dress to Impress/EaselCanvas",
  component: EaselCanvas,
};

export const BlueAcara = () => (
  <EaselCanvas width={300} height={300}>
    <EaselBitmap
      src="http://images.neopets.com/cp/bio/data/000/000/002/2426_898928db88/2426.svg"
      zIndex={10}
    />
    <EaselBitmap
      src="http://images.neopets.com/cp/bio/data/000/000/002/2425_501f596cef/2425.svg"
      zIndex={20}
    />
    <EaselBitmap
      src="http://images.neopets.com/cp/bio/data/000/000/002/2427_f12853f18a/2427.svg"
      zIndex={30}
    />
    <EaselBitmap
      src="http://images.neopets.com/cp/bio/data/000/000/032/32185_dc8f076ae3/32185.svg"
      zIndex={40}
    />
    <EaselBitmap
      src="http://images.neopets.com/cp/bio/data/000/000/002/2428_991dcdedc7/2428.svg"
      zIndex={50}
    />
    <EaselBitmap
      src="http://images.neopets.com/cp/bio/data/000/000/002/2430_87edccba4c/2430.svg"
      zIndex={60}
    />
  </EaselCanvas>
);
