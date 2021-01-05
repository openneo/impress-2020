import React from "react";
import gql from "graphql-tag";
import produce, { enableMapSet } from "immer";
import { useQuery, useApolloClient } from "@apollo/client";
import { useParams } from "react-router-dom";

import { itemAppearanceFragment } from "../components/useOutfitAppearance";

enableMapSet();

export const OutfitStateContext = React.createContext(null);

function useOutfitState() {
  const apolloClient = useApolloClient();
  const initialState = useParseOutfitUrl();
  const [state, dispatchToOutfit] = React.useReducer(
    outfitStateReducer(apolloClient),
    initialState
  );

  const { id, name, speciesId, colorId, pose, appearanceId } = state;

  // It's more convenient to manage these as a Set in state, but most callers
  // will find it more convenient to access them as arrays! e.g. for `.map()`
  const wornItemIds = Array.from(state.wornItemIds);
  const closetedItemIds = Array.from(state.closetedItemIds);
  const allItemIds = [...state.wornItemIds, ...state.closetedItemIds];

  // If there's an outfit ID (i.e. we're on /outfits/:id), load basic data
  // about the outfit. We'll use it to initialize the local state.
  const { loading: outfitLoading, error: outfitError } = useQuery(
    gql`
      query OutfitStateSavedOutfit($id: ID!) {
        outfit(id: $id) {
          id
          name
          petAppearance {
            species {
              id
            }
            color {
              id
            }
            pose
          }
          wornItems {
            id
          }
          closetedItems {
            id
          }

          # TODO: Consider pre-loading some fields, instead of doing them in
          #       follow-up queries?
        }
      }
    `,
    {
      variables: { id },
      skip: id == null,
      onCompleted: (outfitData) => {
        const outfit = outfitData.outfit;
        dispatchToOutfit({
          type: "reset",
          name: outfit.name,
          speciesId: outfit.petAppearance.species.id,
          colorId: outfit.petAppearance.color.id,
          pose: outfit.petAppearance.pose,
          wornItemIds: outfit.wornItems.map((item) => item.id),
          closetedItemIds: outfit.closetedItems.map((item) => item.id),
        });
      },
    }
  );

  const {
    loading: itemsLoading,
    error: itemsError,
    data: itemsData,
  } = useQuery(
    gql`
      query OutfitStateItems(
        $allItemIds: [ID!]!
        $speciesId: ID!
        $colorId: ID!
      ) {
        items(ids: $allItemIds) {
          # TODO: De-dupe this from SearchPanel?
          id
          name
          thumbnailUrl
          isNc
          isPb
          currentUserOwnsThis
          currentUserWantsThis

          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            # This enables us to quickly show the item when the user clicks it!
            ...ItemAppearanceForOutfitPreview

            # This is used to group items by zone, and to detect conflicts when
            # wearing a new item.
            layers {
              zone {
                id
                label @client
              }
            }
            restrictedZones {
              id
              label @client
              isCommonlyUsedByItems @client
            }
          }
        }

        # NOTE: We skip this query if items is empty for perf reasons. If
        #       you're adding more fields, consider changing that condition!
      }
      ${itemAppearanceFragment}
    `,
    {
      variables: { allItemIds, speciesId, colorId },
      // Skip if this outfit has no items, as an optimization; or if we don't
      // have the species/color ID loaded yet because we're waiting on the
      // saved outfit to load.
      skip: allItemIds.length === 0 || speciesId == null || colorId == null,
    }
  );

  const resultItems = itemsData?.items || [];

  // Okay, time for some big perf hacks! Lower down in the app, we use
  // React.memo to avoid re-rendering Item components if the items haven't
  // updated. In simpler cases, we just make the component take the individual
  // item fields as props... but items are complex and that makes it annoying
  // :p Instead, we do these tricks to reuse physical item objects if they're
  // still deep-equal to the previous version. This is because React.memo uses
  // object identity to compare its props, so now when it checks whether
  // `oldItem === newItem`, the answer will be `true`, unless the item really
  // _did_ change!
  const [cachedItemObjects, setCachedItemObjects] = React.useState([]);
  let items = resultItems.map((item) => {
    const cachedItemObject = cachedItemObjects.find((i) => i.id === item.id);
    if (
      cachedItemObject &&
      JSON.stringify(cachedItemObject) === JSON.stringify(item)
    ) {
      return cachedItemObject;
    }
    return item;
  });
  if (
    items.length === cachedItemObjects.length &&
    items.every((_, index) => items[index] === cachedItemObjects[index])
  ) {
    // Even reuse the entire array if none of the items changed!
    items = cachedItemObjects;
  }
  React.useEffect(() => {
    setCachedItemObjects(items);
  }, [items, setCachedItemObjects]);

  const itemsById = {};
  for (const item of items) {
    itemsById[item.id] = item;
  }

  const zonesAndItems = getZonesAndItems(
    itemsById,
    wornItemIds,
    closetedItemIds
  );
  const incompatibleItems = items
    .filter((i) => i.appearanceOn.layers.length === 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const url = buildOutfitUrl(state);

  const outfitState = {
    id,
    zonesAndItems,
    incompatibleItems,
    name,
    wornItemIds,
    closetedItemIds,
    allItemIds,
    speciesId,
    colorId,
    pose,
    appearanceId,
    url,
  };

  // Keep the URL up-to-date. (We don't listen to it, though 😅)
  React.useEffect(() => {
    window.history.replaceState(null, "", url);
  }, [url]);

  return {
    loading: outfitLoading || itemsLoading,
    error: outfitError || itemsError,
    outfitState,
    dispatchToOutfit,
  };
}

const outfitStateReducer = (apolloClient) => (baseState, action) => {
  switch (action.type) {
    case "rename":
      return { ...baseState, name: action.outfitName };
    case "setSpeciesAndColor":
      return {
        ...baseState,
        speciesId: action.speciesId,
        colorId: action.colorId,
        pose: action.pose,
        appearanceId: null,
      };
    case "wearItem":
      return produce(baseState, (state) => {
        const { wornItemIds, closetedItemIds } = state;
        const { itemId, itemIdsToReconsider = [] } = action;

        // Move conflicting items to the closet.
        //
        // We do this by looking them up in the Apollo Cache, which is going to
        // include the relevant item data because the `useOutfitState` hook
        // queries for it!
        //
        // (It could be possible to mess up the timing by taking an action
        // while worn items are still partially loading, but I think it would
        // require a pretty weird action sequence to make that happen... like,
        // doing a search and it loads before the worn item data does? Anyway,
        // Apollo will throw in that case, which should just essentially reject
        // the action.)
        let conflictingIds;
        try {
          conflictingIds = findItemConflicts(itemId, state, apolloClient);
        } catch (e) {
          console.error(e);
          return;
        }
        for (const conflictingId of conflictingIds) {
          wornItemIds.delete(conflictingId);
          closetedItemIds.add(conflictingId);
        }

        // Move this item from the closet to the worn set.
        closetedItemIds.delete(itemId);
        wornItemIds.add(itemId);

        reconsiderItems(itemIdsToReconsider, state, apolloClient);
      });
    case "unwearItem":
      return produce(baseState, (state) => {
        const { wornItemIds, closetedItemIds } = state;
        const { itemId, itemIdsToReconsider = [] } = action;

        // Move this item from the worn set to the closet.
        wornItemIds.delete(itemId);
        closetedItemIds.add(itemId);

        reconsiderItems(itemIdsToReconsider, state, apolloClient);
      });
    case "removeItem":
      return produce(baseState, (state) => {
        const { wornItemIds, closetedItemIds } = state;
        const { itemId, itemIdsToReconsider = [] } = action;

        // Remove this item from both the worn set and the closet.
        wornItemIds.delete(itemId);
        closetedItemIds.delete(itemId);

        reconsiderItems(itemIdsToReconsider, state, apolloClient);
      });
    case "setPose":
      return {
        ...baseState,
        pose: action.pose,

        // Usually only the `pose` is specified, but `PosePickerSupport` can
        // also specify a corresponding `appearanceId`, to get even more
        // particular about which version of the pose to show if more than one.
        appearanceId: action.appearanceId || null,
      };
    case "reset":
      return produce(baseState, (state) => {
        const {
          name,
          speciesId,
          colorId,
          pose,
          wornItemIds,
          closetedItemIds,
        } = action;
        state.name = name;
        state.speciesId = speciesId ? String(speciesId) : baseState.speciesId;
        state.colorId = colorId ? String(colorId) : baseState.colorId;
        state.pose = pose || baseState.pose;
        state.wornItemIds = wornItemIds
          ? new Set(wornItemIds.map(String))
          : baseState.wornItemIds;
        state.closetedItemIds = closetedItemIds
          ? new Set(closetedItemIds.map(String))
          : baseState.closetedItemIds;
      });
    default:
      throw new Error(`unexpected action ${JSON.stringify(action)}`);
  }
};

function useParseOutfitUrl() {
  const { id } = useParams();
  const urlParams = new URLSearchParams(window.location.search);

  return {
    id: id,
    name: urlParams.get("name"),
    speciesId: urlParams.get("species"),
    colorId: urlParams.get("color"),
    pose: urlParams.get("pose") || "HAPPY_FEM",
    appearanceId: urlParams.get("state") || null,
    wornItemIds: new Set(urlParams.getAll("objects[]")),
    closetedItemIds: new Set(urlParams.getAll("closet[]")),
  };
}

function findItemConflicts(itemIdToAdd, state, apolloClient) {
  const { wornItemIds, speciesId, colorId } = state;

  const { items } = apolloClient.readQuery({
    query: gql`
      query OutfitStateItemConflicts(
        $itemIds: [ID!]!
        $speciesId: ID!
        $colorId: ID!
      ) {
        items(ids: $itemIds) {
          id
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            layers {
              zone {
                id
              }
            }

            restrictedZones {
              id
            }
          }
        }
      }
    `,
    variables: {
      itemIds: [itemIdToAdd, ...wornItemIds],
      speciesId,
      colorId,
    },
  });
  const itemToAdd = items.find((i) => i.id === itemIdToAdd);
  if (!itemToAdd.appearanceOn) {
    return [];
  }
  const wornItems = Array.from(wornItemIds).map((id) =>
    items.find((i) => i.id === id)
  );

  const itemToAddZoneSets = getItemZones(itemToAdd);

  const conflictingIds = [];
  for (const wornItem of wornItems) {
    if (!wornItem.appearanceOn) {
      continue;
    }

    const wornItemZoneSets = getItemZones(wornItem);

    const itemsConflict =
      setsIntersect(
        itemToAddZoneSets.occupies,
        wornItemZoneSets.occupiesOrRestricts
      ) ||
      setsIntersect(
        wornItemZoneSets.occupies,
        itemToAddZoneSets.occupiesOrRestricts
      );

    if (itemsConflict) {
      conflictingIds.push(wornItem.id);
    }
  }

  return conflictingIds;
}

function getItemZones(item) {
  const occupies = new Set(item.appearanceOn.layers.map((l) => l.zone.id));
  const restricts = new Set(item.appearanceOn.restrictedZones.map((z) => z.id));
  const occupiesOrRestricts = new Set([...occupies, ...restricts]);
  return { occupies, occupiesOrRestricts };
}

function setsIntersect(a, b) {
  for (const el of a) {
    if (b.has(el)) {
      return true;
    }
  }
  return false;
}

/**
 * Try to add these items back to the outfit, if there would be no conflicts.
 * We use this in Search to try to restore these items after the user makes
 * changes, e.g., after they try on another Background we want to restore the
 * previous one!
 *
 * This mutates state.wornItemIds directly, on the assumption that we're in an
 * immer block, in which case mutation is the simplest API!
 */
function reconsiderItems(itemIdsToReconsider, state, apolloClient) {
  for (const itemIdToReconsider of itemIdsToReconsider) {
    const conflictingIds = findItemConflicts(
      itemIdToReconsider,
      state,
      apolloClient
    );
    if (conflictingIds.length === 0) {
      state.wornItemIds.add(itemIdToReconsider);
    }
  }
}

// TODO: Get this out of here, tbh...
function getZonesAndItems(itemsById, wornItemIds, closetedItemIds) {
  const wornItems = wornItemIds.map((id) => itemsById[id]).filter((i) => i);
  const closetedItems = closetedItemIds
    .map((id) => itemsById[id])
    .filter((i) => i);

  // We use zone label here, rather than ID, because some zones have the same
  // label and we *want* to over-simplify that in this UI. (e.g. there are
  // multiple Hat zones, and some items occupy different ones, but mostly let's
  // just group them and if they don't conflict then all the better!)
  const allItems = [...wornItems, ...closetedItems];
  const itemsByZoneLabel = new Map();
  for (const item of allItems) {
    if (!item.appearanceOn) {
      continue;
    }

    for (const layer of item.appearanceOn.layers) {
      const zoneLabel = layer.zone.label;

      if (!itemsByZoneLabel.has(zoneLabel)) {
        itemsByZoneLabel.set(zoneLabel, []);
      }
      itemsByZoneLabel.get(zoneLabel).push(item);
    }
  }

  let zonesAndItems = Array.from(itemsByZoneLabel.entries()).map(
    ([zoneLabel, items]) => ({
      zoneLabel: zoneLabel,
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    })
  );
  zonesAndItems.sort((a, b) => a.zoneLabel.localeCompare(b.zoneLabel));

  // As one last step, try to remove zone groups that aren't helpful.
  const groupsWithConflicts = zonesAndItems.filter(
    ({ items }) => items.length > 1
  );
  const itemIdsWithConflicts = new Set(
    groupsWithConflicts
      .map(({ items }) => items)
      .flat()
      .map((item) => item.id)
  );
  const itemIdsWeHaveSeen = new Set();
  zonesAndItems = zonesAndItems.filter(({ items }) => {
    // We need all groups with more than one item. If there's only one, we get
    // to think harder :)
    if (items.length > 1) {
      items.forEach((item) => itemIdsWeHaveSeen.add(item.id));
      return true;
    }

    const item = items[0];

    // Has the item been seen a group we kept, or an upcoming group with
    // multiple conflicting items? If so, skip this group. If not, keep it.
    if (itemIdsWeHaveSeen.has(item.id) || itemIdsWithConflicts.has(item.id)) {
      return false;
    } else {
      itemIdsWeHaveSeen.add(item.id);
      return true;
    }
  });

  return zonesAndItems;
}

function buildOutfitUrl(state) {
  const {
    id,
    name,
    speciesId,
    colorId,
    pose,
    appearanceId,
    wornItemIds,
    closetedItemIds,
  } = state;

  const { origin, pathname } = window.location;

  if (id) {
    return origin + `/outfits/${id}`;
  }

  const params = new URLSearchParams({
    name: name || "",
    species: speciesId,
    color: colorId,
    pose,
  });
  for (const itemId of wornItemIds) {
    params.append("objects[]", itemId);
  }
  for (const itemId of closetedItemIds) {
    params.append("closet[]", itemId);
  }
  if (appearanceId != null) {
    // `state` is an old name for compatibility with old-style DTI URLs. It
    // refers to "PetState", the database table name for pet appearances.
    params.append("state", appearanceId);
  }

  return origin + pathname + "?" + params.toString();
}

export default useOutfitState;
