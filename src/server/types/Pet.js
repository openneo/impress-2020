import util from "util";
import { gql } from "apollo-server";
import xmlrpc from "xmlrpc";
import { getPoseFromPetState } from "../util";
import { saveModelingData } from "../modeling";

const typeDefs = gql`
  type Pet {
    id: ID!
    name: String!
    petAppearance: PetAppearance!
    wornItems: [Item!]!

    species: Species! # to be deprecated? can use petAppearance? 🤔
    color: Color! # to be deprecated? can use petAppearance? 🤔
    pose: Pose! # to be deprecated? can use petAppearance? 🤔
    items: [Item!]! # deprecated alias for wornItems
  }

  extend type Query {
    petOnNeopetsDotCom(petName: String!): Pet
  }
`;

const resolvers = {
  Pet: {
    species: ({ customPetData }) => ({
      id: String(customPetData.custom_pet.species_id),
    }),
    color: ({ customPetData }) => ({
      id: String(customPetData.custom_pet.color_id),
    }),
    pose: ({ customPetData, petMetaData }) =>
      getPoseFromPetData(petMetaData, customPetData),
    petAppearance: async (
      { name, customPetData, petMetaData },
      _,
      { petTypeBySpeciesAndColorLoader, petStatesForPetTypeLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId: customPetData.custom_pet.species_id,
        colorId: customPetData.custom_pet.color_id,
      });
      const petStates = petType
        ? await petStatesForPetTypeLoader.load(petType.id)
        : [];

      let petState;

      // First, look for a pet state containing exactly the same assets as this
      // one.
      const swfAssetIdsString = Object.values(
        customPetData.custom_pet.biology_by_zone
      )
        .map((b) => b.part_id)
        .sort((a, b) => Number(a) - Number(b))
        .join(",");
      petState = petStates.find((ps) => ps.swfAssetIds === swfAssetIdsString);
      if (petState) {
        return { id: petState.id };
      }

      // Next, look for a pet state matching the same pose. (This can happen if
      // modeling data for this pet hasn't saved yet.)
      const pose = getPoseFromPetData(petMetaData, customPetData);
      petState = petStates.find((ps) => getPoseFromPetState(ps) === pose);
      if (petState) {
        console.warn(
          `Warning: For pet "${name}", fell back to pet state ${petState.id} ` +
            `because it matches pose ${pose}. Actual pet state for these ` +
            `assets not found: ${swfAssetIdsString}`
        );
        return { id: petState.id };
      }

      // Finally, look for an UNKNOWN pet state. (This can happen if modeling
      // data for this pet hasn't saved yet, and we haven't manually labeled a
      // matching pose.)
      petState = petStates.find((ps) => getPoseFromPetState(ps) === "UNKNOWN");
      if (petState) {
        console.warn(
          `Warning: For pet "${name}", fell back to pet state ${petState.id} ` +
            `as an UNKNOWN fallback pose. Actual pet state for these ` +
            `assets not found: ${swfAssetIdsString}`
        );
        return { id: petState.id };
      }

      // If we still don't have a pet state, raise an error. (This can happen
      // for a brand new new species/color combination, when the modeling data
      // hasn't been saved yet.)
      throw new Error(
        `This pet's modeling data isn't loaded into our database yet, ` +
          `sorry! Try using the Modeling Hub on Classic DTI to upload it first?`
      );
    },
    wornItems: ({ customPetData }) =>
      Object.values(customPetData.object_info_registry).map((o) => ({
        id: o.obj_info_id,
        name: o.name,
        description: o.description,
        thumbnailUrl: o.thumbnail_url,
        rarityIndex: o.rarity_index,
      })),
    items: (...args) => resolvers.Pet.wornItems(...args),
  },
  Query: {
    petOnNeopetsDotCom: async (
      _,
      { petName },
      {
        db,
        petTypeBySpeciesAndColorLoader,
        petStateByPetTypeAndAssetsLoader,
        itemLoader,
        itemTranslationLoader,
        swfAssetByRemoteIdLoader,
      }
    ) => {
      const [customPetData, petMetaData] = await Promise.all([
        loadCustomPetData(petName),
        loadPetMetaData(petName),
      ]);

      await saveModelingData(customPetData, petMetaData, {
        db,
        petTypeBySpeciesAndColorLoader,
        petStateByPetTypeAndAssetsLoader,
        itemLoader,
        itemTranslationLoader,
        swfAssetByRemoteIdLoader,
      });

      return { name: petName, customPetData, petMetaData };
    },
  },
};

const neopetsXmlrpcClient = xmlrpc.createClient({
  host: "www.neopets.com",
  port: 80,
  path: "/amfphp/xmlrpc.php",
});
const neopetsXmlrpcCall = util
  .promisify(neopetsXmlrpcClient.methodCall)
  .bind(neopetsXmlrpcClient);

async function loadPetMetaData(petName) {
  const response = await neopetsXmlrpcCall("PetService.getPet", [petName]);
  return response;
}

async function loadCustomPetData(petName) {
  const response = await neopetsXmlrpcCall("CustomPetService.getViewerData", [
    petName,
  ]);
  return response;
}

function getPoseFromPetData(petMetaData, petCustomData) {
  const moodId = petMetaData.mood;
  const genderId = petMetaData.gender;
  if (Object.keys(petCustomData.custom_pet.biology_by_zone).length === 1) {
    return "UNCONVERTED";
  } else if (String(moodId) === "1" && String(genderId) === "1") {
    return "HAPPY_MASC";
  } else if (String(moodId) === "1" && String(genderId) === "2") {
    return "HAPPY_FEM";
  } else if (String(moodId) === "2" && String(genderId) === "1") {
    return "SAD_MASC";
  } else if (String(moodId) === "2" && String(genderId) === "2") {
    return "SAD_FEM";
  } else if (String(moodId) === "4" && String(genderId) === "1") {
    return "SICK_MASC";
  } else if (String(moodId) === "4" && String(genderId) === "2") {
    return "SICK_FEM";
  } else {
    throw new Error(
      `could not identify pose: ` +
        `moodId=${moodId}, ` +
        `genderId=${genderId}`
    );
  }
}

module.exports = { typeDefs, resolvers };
