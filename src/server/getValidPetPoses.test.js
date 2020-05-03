import getValidPetPoses from "./getValidPetPoses";

describe("getValidPetPoses", () => {
  it("gets them and writes them to a buffer", async () => {
    const buffer = await getValidPetPoses();
    expect(buffer.toString()).toMatchSnapshot();
  });
});
