import { renderOutfitImage } from "./outfit-images";
import { toMatchImageSnapshot } from "jest-image-snapshot";
expect.extend({ toMatchImageSnapshot });

const originalConsoleWarn = console.warn;

describe("renderOutfitImage", () => {
  beforeEach(() => {
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  it("renders the Moon and Stars Background and Green Leaf String Lights, as PNG", async () => {
    const image = await renderOutfitImage(
      [
        "https://impress-asset-images.s3.amazonaws.com/object/000/000/006/6829/600x600.png",
        "https://impress-asset-images.s3.amazonaws.com/object/000/000/036/36414/600x600.png",
      ],
      600
    );
    expect(image).toMatchImageSnapshot();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("renders the Moon and Stars Background and Green Leaf String Lights, as SVG", async () => {
    const image = await renderOutfitImage(
      [
        "http://images.neopets.com/cp/items/data/000/000/006/6829_1707e50385/6829.svg",
        "http://images.neopets.com/cp/items/data/000/000/036/36414_1e2aaab4ad/36414.svg",
      ],
      600
    );
    expect(image).toMatchImageSnapshot();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("skips network failures, and logs an error", async () => {
    const image = await renderOutfitImage(
      [
        "https://impress-asset-images.s3.amazonaws.com/object/000/000/006/6829/600x600.png",
        "https://impress-asset-images.s3.amazonaws.com/object/000/000/000/00000000/600x600.png", // fake URL
      ],
      600
    );
    expect(image).toMatchImageSnapshot();
    expect(console.warn).toHaveBeenCalledWith(
      `Error loading layer, skipping: Server responded with 403. (https://impress-asset-images.s3.amazonaws.com/object/000/000/000/00000000/600x600.png)`
    );
  });
});
