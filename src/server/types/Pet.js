import { gql } from "apollo-server";
import { getPoseFromPetState } from "../util";
import { saveModelingData } from "../modeling";
import { loadCustomPetData, loadPetMetaData } from "../load-pet-data";

const typeDefs = gql`
  type Pet {
    id: ID!
    name: String!
    wornItems: [Item!]!

    """
    The pet's appearance. Can be null if the pet is in an invalid buggy state
    that Neopets.com's own customization system doesn't support yet.
    """
    petAppearance: PetAppearance
  }

  extend type Query {
    petOnNeopetsDotCom(petName: String!): Pet
  }
`;

const resolvers = {
  Pet: {
    id: ({ name }) => name,
    petAppearance: async (
      { name, customPetData, petMetaData },
      _,
      { petTypeBySpeciesAndColorLoader, petStatesForPetTypeLoader }
    ) => {
      if (customPetData == null) {
        return null;
      }

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
      // modeling data for this pet hasn't saved yet.) (We might skip this step
      // if we couldn't load either the custom pet data or metadata, which is
      // expected if e.g. the pet name starts with a leading digit, so we can
      // use a workaround for the custom pet data but the JSON endpoint for
      // metadata fails.)
      if (petMetaData != null && customPetData != null) {
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
    wornItems: ({ customPetData }) => {
      if (customPetData == null) {
        return [];
      }

      return Object.values(customPetData.object_info_registry).map((o) => ({
        id: o.obj_info_id,
        name: o.name,
        description: o.description,
        thumbnailUrl: o.thumbnail_url,
        rarityIndex: o.rarity_index,
      }));
    },
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
        loadPetMetaData(petName).catch((error) => {
          console.warn(`Couldn't load metadata for pet ${petName}: `, error);
          return null;
        }),
      ]);

      if (
        customPetData != null &&
        petMetaData != null &&
        process.env["USE_NEW_MODELING"] === "1"
      ) {
        await saveModelingData(customPetData, petMetaData, {
          db,
          petTypeBySpeciesAndColorLoader,
          petStateByPetTypeAndAssetsLoader,
          itemLoader,
          itemTranslationLoader,
          swfAssetByRemoteIdLoader,
        });
      }

      return { name: petName, customPetData, petMetaData };
    },
  },
};

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
