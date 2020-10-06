const fetch = require("node-fetch");
const { gql } = require("apollo-server");

const { getPoseFromPetState } = require("../util");
const { saveModelingData } = require("../modeling");

const typeDefs = gql`
  type Outfit {
    id: ID!
    name: String!
    petAppearance: PetAppearance!
    wornItems: [Item!]!
    closetedItems: [Item!]!
  }

  # TODO: This maybe should move to a separate file?
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
    outfit(id: ID!): Outfit
    petOnNeopetsDotCom(petName: String!): Pet
  }
`;

const resolvers = {
  Outfit: {
    name: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return outfit.name;
    },
    petAppearance: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return { id: outfit.petStateId };
    },
    wornItems: async ({ id }, _, { itemOutfitRelationshipsLoader }) => {
      const relationships = await itemOutfitRelationshipsLoader.load(id);
      return relationships
        .filter((oir) => oir.isWorn)
        .map((oir) => ({ id: oir.itemId }));
    },
    closetedItems: async ({ id }, _, { itemOutfitRelationshipsLoader }) => {
      const relationships = await itemOutfitRelationshipsLoader.load(id);
      return relationships
        .filter((oir) => !oir.isWorn)
        .map((oir) => ({ id: oir.itemId }));
    },
  },
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

async function loadPetMetaData(petName) {
  const url = `http://www.neopets.com/amfphp/json.php/PetService.getPet/${petName}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `for pet meta data, neopets.com returned: ` +
        `${res.status} ${res.statusText}. (${url})`
    );
  }

  const json = await res.json();
  return json;
}

async function loadCustomPetData(petName) {
  const url =
    `http://www.neopets.com/amfphp/json.php/CustomPetService.getViewerData` +
    `/${petName}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `for custom pet data, neopets.com returned: ` +
        `${res.status} ${res.statusText}. (${url})`
    );
  }

  const json = await res.json();
  if (!json.custom_pet) {
    throw new Error(`missing custom_pet data`);
  }

  return json;
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
