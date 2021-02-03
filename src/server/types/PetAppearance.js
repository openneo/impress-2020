import { gql } from "apollo-server";

import {
  capitalize,
  getPoseFromPetState,
  getRestrictedZoneIds,
  oneWeek,
  oneDay,
  oneHour,
} from "../util";

const typeDefs = gql`
  type Color @cacheControl(maxAge: ${oneWeek}) {
    id: ID!
    name: String!
    isStandard: Boolean!
  }

  type Species @cacheControl(maxAge: ${oneWeek}) {
    id: ID!
    name: String!

    # The bodyId for PetAppearances that use this species and a standard color.
    # We use this to preload the standard body IDs, so that items stay when
    # switching between standard colors.
    standardBodyId: ID!
  }

  """
  The poses a PetAppearance can take!
  """
  enum Pose {
    HAPPY_MASC
    SAD_MASC
    SICK_MASC
    HAPPY_FEM
    SAD_FEM
    SICK_FEM
    UNCONVERTED
    UNKNOWN # for when we have the data, but we don't know what it is
  }

  type Body @cacheControl(maxAge: ${oneDay}, staleWhileRevalidate: ${oneWeek}) {
    id: ID!
    species: Species!

    # A PetAppearance that has this body. Prefers Blue and happy poses.
    canonicalAppearance: PetAppearance

    # Whether this is the special body type that represents fitting _all_ pets.
    representsAllBodies: Boolean!
  }

  type PetAppearance @cacheControl(maxAge: ${oneHour}, staleWhileRevalidate: ${oneWeek}) {
    id: ID!
    species: Species!
    color: Color!
    pose: Pose!
    bodyId: ID!

    layers: [AppearanceLayer!]!
    restrictedZones: [Zone!]!

    petStateId: ID! # Deprecated, an alias for id
    # Whether this PetAppearance is known to look incorrect. This is a manual
    # flag that we set, in the case where this glitchy PetAppearance really did
    # appear on Neopets.com, and has since been fixed.
    isGlitched: Boolean!
  }

  extend type Query {
    color(id: ID!): Color
    allColors: [Color!]! @cacheControl(maxAge: ${oneHour}, staleWhileRevalidate: ${oneWeek})
    species(id: ID!): Species
    allSpecies: [Species!]! @cacheControl(maxAge: ${oneDay}, staleWhileRevalidate: ${oneWeek})
    petAppearanceById(id: ID!): PetAppearance @cacheControl(maxAge: 0) # Only Support really uses this, show changes fast
    # The canonical pet appearance for the given species, color, and pose.
    # Null if we don't have any data for this combination.
    petAppearance(speciesId: ID!, colorId: ID!, pose: Pose!): PetAppearance
      @cacheControl(maxAge: 1, staleWhileRevalidate: ${oneDay})
    # All pet appearances we've ever seen for the given species and color. Note
    # that this might include multiple copies for the same pose, and they might
    # even be glitched data. We use this for Support tools, and we don't cache
    # it to make sure that Support users are always seeing the most up-to-date
    # version here (even if the standard pose picker is still showing outdated
    # cached canonical poses).
    petAppearances(speciesId: ID!, colorId: ID!): [PetAppearance!]!
  }
`;

const resolvers = {
  Color: {
    name: async ({ id }, _, { colorTranslationLoader }) => {
      const colorTranslation = await colorTranslationLoader.load(id);
      return capitalize(colorTranslation.name);
    },
    isStandard: async ({ id }, _, { colorLoader }) => {
      const color = await colorLoader.load(id);
      return color.standard ? true : false;
    },
  },

  Species: {
    name: async ({ id }, _, { speciesTranslationLoader }) => {
      const speciesTranslation = await speciesTranslationLoader.load(id);
      return capitalize(speciesTranslation.name);
    },
    standardBodyId: async ({ id }, _, { petTypeBySpeciesAndColorLoader }) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId: id,
        colorId: "8", // Blue
      });

      // In production, this should ~never happen, because all species have a
      // Blue version, or at least if a new one is added it will be modeled
      // quickly! But in development, before modeling happens, it's possible
      // for this to be empty, so we return a fake body ID. (This seems better
      // than making it nullable, which adds downstream complexity for a
      // particularly edge-y case that generally isn't worth considering.)
      if (!petType) {
        return `<ERROR-BLUE-PET-NOT-MODELED-FOR-SPECIES-${id}>`;
      }

      return petType.bodyId;
    },
  },

  Body: {
    species: ({ species }) => {
      if (species) {
        return species;
      }
      throw new Error(
        "HACK: We populate this when you look up a canonicalAppearance, but " +
          "don't have a direct query for it yet, oops!"
      );
    },
    representsAllBodies: ({ id }) => {
      return id == "0";
    },
    canonicalAppearance: async (
      { id },
      _,
      { canonicalPetStateForBodyLoader }
    ) => {
      const petState = await canonicalPetStateForBodyLoader.load(id);
      if (!petState) {
        return null;
      }
      return { id: petState.id };
    },
  },

  PetAppearance: {
    color: async ({ id }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(id);
      const petType = await petTypeLoader.load(petState.petTypeId);
      return { id: petType.colorId };
    },
    species: async ({ id }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(id);
      const petType = await petTypeLoader.load(petState.petTypeId);
      return { id: petType.speciesId };
    },
    bodyId: async ({ id }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(id);
      const petType = await petTypeLoader.load(petState.petTypeId);
      return petType.bodyId;
    },
    pose: async ({ id }, _, { petStateLoader }) => {
      const petState = await petStateLoader.load(id);
      return getPoseFromPetState(petState);
    },
    layers: async ({ id }, _, { petSwfAssetLoader }) => {
      const swfAssets = await petSwfAssetLoader.load(id);
      return swfAssets;
    },
    restrictedZones: async ({ id }, _, { petSwfAssetLoader }) => {
      // The restricted zones are defined on the layers. Load them and aggegate
      // the zones, then uniquify and sort them for ease of use.
      const swfAssets = await petSwfAssetLoader.load(id);
      let restrictedZoneIds = swfAssets
        .map((sa) => getRestrictedZoneIds(sa.zonesRestrict))
        .flat();
      restrictedZoneIds = [...new Set(restrictedZoneIds)];
      restrictedZoneIds.sort((a, b) => parseInt(a) - parseInt(b));
      return restrictedZoneIds.map((id) => ({ id }));
    },
    petStateId: ({ id }) => id,
    isGlitched: async ({ id }, _, { petStateLoader }) => {
      const petState = await petStateLoader.load(id);
      return petState.glitched;
    },
  },

  Query: {
    color: async (_, { id }, { colorLoader }) => {
      const color = await colorLoader.load(id);
      if (!color) {
        return null;
      }
      return { id };
    },
    allColors: async (_, __, { colorLoader }) => {
      const allColors = await colorLoader.loadAll();
      return allColors;
    },
    species: async (_, { id }, { speciesLoader }) => {
      const species = await speciesLoader.load(id);
      if (!species) {
        return null;
      }
      return { id };
    },
    allSpecies: async (_, __, { speciesLoader }) => {
      const allSpecies = await speciesLoader.loadAll();
      return allSpecies;
    },
    petAppearanceById: (_, { id }) => ({ id }),
    petAppearance: async (
      _,
      { speciesId, colorId, pose },
      { petTypeBySpeciesAndColorLoader, petStatesForPetTypeLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });
      if (!petType) {
        return null;
      }

      // TODO: We could query for this more directly, instead of loading all
      //       appearances 🤔
      const petStates = await petStatesForPetTypeLoader.load(petType.id);
      const petState = petStates.find((ps) => getPoseFromPetState(ps) === pose);
      if (!petState) {
        return null;
      }

      return { id: petState.id };
    },
    petAppearances: async (
      _,
      { speciesId, colorId },
      { petTypeBySpeciesAndColorLoader, petStatesForPetTypeLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });
      const petStates = await petStatesForPetTypeLoader.load(petType.id);
      return petStates.map((petState) => ({ id: petState.id }));
    },
  },
};

module.exports = { typeDefs, resolvers };
