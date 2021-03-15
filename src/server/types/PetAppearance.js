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

    # All SpeciesColorPairs of this color.
    appliedToAllCompatibleSpecies: [SpeciesColorPair!]! @cacheControl(maxAge: 1, staleWhileRevalidate: ${oneDay})
  }

  type Species @cacheControl(maxAge: ${oneWeek}) {
    id: ID!
    name: String!

    # A PetAppearance that has this species. Prefers Blue (or the optional
    # preferredColorId), and happy poses.
    canonicalAppearance(preferredColorId: ID): PetAppearance

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

    # Whether this is the special body type that represents fitting _all_ pets.
    representsAllBodies: Boolean!

    # The species this body belongs to. Null if representsAllBodies is true.
    species: Species

    # A PetAppearance that has this body. Prefers Blue (or the optional
    # preferredColorId), and happy poses.
    canonicalAppearance(preferredColorId: ID): PetAppearance
  }

  type PetAppearance @cacheControl(maxAge: ${oneHour}, staleWhileRevalidate: ${oneWeek}) {
    id: ID!
    species: Species!
    color: Color!
    pose: Pose!
    body: Body!
    bodyId: ID!

    layers: [AppearanceLayer!]!
    restrictedZones: [Zone!]!

    petStateId: ID! # Deprecated, an alias for id
    # Whether this PetAppearance is known to look incorrect. This is a manual
    # flag that we set, in the case where this glitchy PetAppearance really did
    # appear on Neopets.com, and has since been fixed.
    isGlitched: Boolean!
  }

  # Like a PetAppearance, but with no pose specified. Species and color are
  # enough info to specify a body; and the neopetsImageHash values we save
  # don't have gender presentation specified, anyway, so they're available
  # here.
  type SpeciesColorPair {
    id: ID!
    species: Species!
    color: Color!
    body: Body!

    # A hash to use in a pets.neopets.com image URL. Might be null if we don't
    # have one for this pair, which is uncommon - but it's _somewhat_ common
    # for them to have clothes, if we've never seen a plain version modeled.
    neopetsImageHash: String
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
    appliedToAllCompatibleSpecies: async (
      { id },
      _,
      { petTypesForColorLoader }
    ) => {
      const petTypes = await petTypesForColorLoader.load(id);
      const speciesColorPairs = petTypes.map((petType) => ({ id: petType.id }));
      return speciesColorPairs;
    },
  },

  Species: {
    name: async ({ id }, _, { speciesTranslationLoader }) => {
      const speciesTranslation = await speciesTranslationLoader.load(id);
      return capitalize(speciesTranslation.name);
    },

    canonicalAppearance: async (
      { id, species },
      { preferredColorId },
      { petTypeBySpeciesAndColorLoader, canonicalPetStateForBodyLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId: id,
        colorId: preferredColorId || "8", // defaults to Blue
      });
      if (!petType) {
        // HACK: For a new species, we shouldn't necessarily crash if Blue
        //       isn't modeled… but like, whatever :p
        return null;
      }

      const petState = await canonicalPetStateForBodyLoader.load({
        bodyId: petType.bodyId,
        preferredColorId,
        fallbackColorId: FALLBACK_COLOR_IDS[species?.id] || "8",
      });
      if (!petState) {
        return null;
      }

      return { id: petState.id };
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
    species: ({ id, species }) => {
      if (id == "0") {
        return null;
      }
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
      { id, species },
      { preferredColorId },
      { canonicalPetStateForBodyLoader }
    ) => {
      const petState = await canonicalPetStateForBodyLoader.load({
        bodyId: id,
        preferredColorId,
        fallbackColorId: FALLBACK_COLOR_IDS[species?.id] || "8",
      });
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
    body: async ({ id }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(id);
      const petType = await petTypeLoader.load(petState.petTypeId);
      return { id: petType.bodyId };
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

  SpeciesColorPair: {
    species: async ({ id }, _, { petTypeLoader }) => {
      const petType = await petTypeLoader.load(id);
      return { id: petType.speciesId };
    },
    color: async ({ id }, _, { petTypeLoader }) => {
      const petType = await petTypeLoader.load(id);
      return { id: petType.colorId };
    },
    body: async ({ id }, _, { petTypeLoader }) => {
      const petType = await petTypeLoader.load(id);
      return { id: petType.bodyId };
    },
    neopetsImageHash: async ({ id }, _, { petTypeLoader }) => {
      const petType = await petTypeLoader.load(id);

      // `basicImageHash` is guaranteed to be a plain no-clothes image, whereas
      // `imageHash` prefers to be if possible, but might not be. (I forget the
      // details on how this was implemented in Classic, so I'm not _sure_ on
      // `imageHash` preferences during modeling… but I'm confident that
      // `basicImageHash` is always better, and `imageHash` is better than
      // nothing!)
      return petType.basicImageHash || petType.imageHash;
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

// NOTE: This matches the colors on ItemPage, so that they always match!
const colors = { BLUE: "8", RED: "61", GREEN: "34", YELLOW: "84" };
const FALLBACK_COLOR_IDS = {
  "1": colors.GREEN, // Acara
  "2": colors.BLUE, // Aisha
  "3": colors.YELLOW, // Blumaroo
  "4": colors.YELLOW, // Bori
  "5": colors.YELLOW, // Bruce
  "6": colors.YELLOW, // Buzz
  "7": colors.RED, // Chia
  "8": colors.YELLOW, // Chomby
  "9": colors.GREEN, // Cybunny
  "10": colors.YELLOW, // Draik
  "11": colors.RED, // Elephante
  "12": colors.RED, // Eyrie
  "13": colors.GREEN, // Flotsam
  "14": colors.YELLOW, // Gelert
  "15": colors.BLUE, // Gnorbu
  "16": colors.BLUE, // Grarrl
  "17": colors.GREEN, // Grundo
  "18": colors.RED, // Hissi
  "19": colors.GREEN, // Ixi
  "20": colors.YELLOW, // Jetsam
  "21": colors.GREEN, // Jubjub
  "22": colors.YELLOW, // Kacheek
  "23": colors.BLUE, // Kau
  "24": colors.GREEN, // Kiko
  "25": colors.GREEN, // Koi
  "26": colors.RED, // Korbat
  "27": colors.BLUE, // Kougra
  "28": colors.BLUE, // Krawk
  "29": colors.YELLOW, // Kyrii
  "30": colors.YELLOW, // Lenny
  "31": colors.YELLOW, // Lupe
  "32": colors.BLUE, // Lutari
  "33": colors.YELLOW, // Meerca
  "34": colors.GREEN, // Moehog
  "35": colors.BLUE, // Mynci
  "36": colors.BLUE, // Nimmo
  "37": colors.YELLOW, // Ogrin
  "38": colors.RED, // Peophin
  "39": colors.GREEN, // Poogle
  "40": colors.RED, // Pteri
  "41": colors.YELLOW, // Quiggle
  "42": colors.BLUE, // Ruki
  "43": colors.RED, // Scorchio
  "44": colors.YELLOW, // Shoyru
  "45": colors.RED, // Skeith
  "46": colors.YELLOW, // Techo
  "47": colors.BLUE, // Tonu
  "48": colors.YELLOW, // Tuskaninny
  "49": colors.GREEN, // Uni
  "50": colors.RED, // Usul
  "55": colors.YELLOW, // Vandagyre
  "51": colors.YELLOW, // Wocky
  "52": colors.RED, // Xweetok
  "53": colors.RED, // Yurble
  "54": colors.BLUE, // Zafara
};

module.exports = { typeDefs, resolvers };
