const util = require("util");

const fetch = require("node-fetch");
const { gql } = require("apollo-server");
const xmlrpc = require("xmlrpc");

const { getPoseFromPetState } = require("../util");
const { saveModelingData } = require("../modeling");

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
      id: customPetData.custom_pet.species_id,
    }),
    color: ({ customPetData }) => ({ id: customPetData.custom_pet.color_id }),
    pose: ({ customPetData, petMetaData }) =>
      getPoseFromPetData(petMetaData, customPetData),
    petAppearance: async (
      { customPetData, petMetaData },
      _,
      { petTypeBySpeciesAndColorLoader, petStatesForPetTypeLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId: customPetData.custom_pet.species_id,
        colorId: customPetData.custom_pet.color_id,
      });
      const petStates = await petStatesForPetTypeLoader.load(petType.id);
      const pose = getPoseFromPetData(petMetaData, customPetData);
      const petState = petStates.find((ps) => getPoseFromPetState(ps) === pose);
      return { id: petState.id };
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
    outfit: (_, { id }) => ({ id }),
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
      const [customPetData, petMetaData, __] = await Promise.all([
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
