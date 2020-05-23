import getValidPetPoses from "./getValidPetPoses";

describe("getValidPetPoses", () => {
  it("gets them and writes them to a buffer", async () => {
    const buffer = await getValidPetPoses();
    expect(asBinaryString(buffer)).toMatchSnapshot();
  });
});

function asBinaryString(buffer) {
  let str = "";
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer.readUInt8(i);
    str += byte.toString(2).padStart(8, "0") + "\n";
  }
  return str;
}
