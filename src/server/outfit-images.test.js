const { renderOutfitImage } = require("./outfit-images");

const { toMatchImageSnapshot } = require("jest-image-snapshot");
expect.extend({ toMatchImageSnapshot });

describe("renderOutfitImage", () => {
  it("renders a test xwee", async () => {
    const image = await renderOutfitImage();
    expect(image).toMatchImageSnapshot();
  });
});
