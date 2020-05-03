import getValidPetPoses from "../src/server/getValidPetPoses";

export default async (req, res) => {
  const buffer = await getValidPetPoses();
  res.status(200).send(buffer);
};
