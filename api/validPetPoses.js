import getValidPetPoses from "../src/server/getValidPetPoses";

export default async (req, res) => {
  const buffer = await getValidPetPoses();

  // Cache for 1 hour. This will also cache at Vercel's CDN, so the function
  // shouldn't even get run very often at all!
  res.setHeader("Cache-Control", "max-age=3600");

  res.status(200).send(buffer);
};
