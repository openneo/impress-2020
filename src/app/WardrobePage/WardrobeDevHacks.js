import React from "react";
import gql from "graphql-tag";
import { useApolloClient } from "@apollo/client";

import { OutfitStateContext } from "./useOutfitState";
import zones from "../cached-data/zones.json";

/**
 * WardrobeDevHacks adds some hacky dev tools to the browser console, by
 * attaching them to the global window object!
 *
 * This is for debug tools / hacky Support tools that don't really need a
 * fully-powered UI.
 */
function WardrobeDevHacks() {
  const client = useApolloClient();
  const outfitState = React.useContext(OutfitStateContext);

  /**
   * DTIHackLayerZone temporarily sets the given layer to the given zone, on
   * your machine only. It resets once you reload the page. This can be useful
   * for testing alternate zones, when making bug reports to TNT!
   *
   * Arguments:
   *   - layerId: The "DTI ID" of the layer to change.
   *   - zoneIdOrName: The ID or the name of the zone to set it to. (If there's
   *                   more than one zone matching the name, we use the one
   *                   with the smaller ID number.)
   *
   * Example:
   *   - `DTIHackLayerZone(449653, "Foreground")` shows the #1 Fan Room
   *     Background as if it were a Foreground.
   *   - `DTIHackLayerZone(142880, 36)` shows the Beaded Shell Earrings on
   *     Skeith as if they used the further-back Earrings zone, instead of the
   *     further-forward Earrings zone.
   */
  const DTIHackLayerZone = React.useCallback(
    (layerId, zoneIdOrName, { force = false } = {}) => {
      const zone = findZone(zoneIdOrName, force);

      const layer = client.readFragment({
        id: `AppearanceLayer:${layerId}`,
        fragment: gql`
          fragment HackReadAppearanceLayer on AppearanceLayer {
            zone {
              id
            }
          }
        `,
      });
      if (!layer && !force) {
        throw new Error(
          `no layer found with ID ${JSON.stringify(layerId)}. ` +
            `is it loaded in the outfit yet? ` +
            `call again with {force: true} to do it anyway!`
        );
      }

      // Add a zone record to the Apollo cache, in case it's not there yet!
      client.writeFragment({
        id: `Zone:${zone.id}`,
        fragment: gql`
          fragment HackWriteZone on Zone {
            id
          }
        `,
        data: { __typename: "Zone", id: zone.id },
      });

      client.writeFragment({
        id: `AppearanceLayer:${layerId}`,
        fragment: gql`
          fragment HackWriteAppearanceLayer on AppearanceLayer {
            zone
          }
        `,
        data: { zone: { __ref: `Zone:${zone.id}` } },
      });

      console.log(
        `Updated layer ${layerId} to zone ${zone.id} (was ${layer?.zone?.id})`
      );
    },
    [client]
  );
  useExposedGlobal("DTIHackLayerZone", DTIHackLayerZone);

  /**
   * DTIHackRestrictedZoneAdd temporarily restricts the given zone on the given
   * item, on your machine only. It resets once you reload the page. This can
   * be useful for testing alternate restrictions, when making bug reports to
   * TNT!
   *
   * Note that, due to hacky limitations on how we currently store data in the
   * app, these changes will only apply to the species/color of your current
   * outfit. Other pets will still have the default restrictions, unless you
   * hack them separately.
   *
   * Arguments:
   *   - itemId: The "Item ID" of the item to change.
   *   - zoneIdOrName: The ID or the name of the zone to restrict. (If there's
   *                   more than one zone matching the name, we use the one
   *                   with the smaller ID number.)
   */
  const DTIHackRestrictedZoneAdd = React.useCallback(
    (itemId, zoneIdOrName, { force = false } = {}) => {
      const zone = findZone(zoneIdOrName, force);

      // TODO: This stuff makes it a bit annoying that we put restricts on the
      //       appearance instead of the item in the GraphQL API... could move!
      const data = client.readQuery({
        query: gql`
          query DTIHackRestrictedZoneAddRead(
            $itemId: ID!
            $speciesId: ID!
            $colorId: ID!
          ) {
            item(id: $itemId) {
              id
              appearanceOn(speciesId: $speciesId, colorId: $colorId) {
                id
                restrictedZones {
                  id
                }
              }
            }
          }
        `,
        variables: {
          itemId,
          speciesId: outfitState.speciesId,
          colorId: outfitState.colorId,
        },
      });
      if (!data && !force) {
        throw new Error(
          `no item found with ID ${JSON.stringify(itemId)}. ` +
            `is it loaded in the outfit yet? ` +
            `call again with {force: true} to do it anyway!`
        );
      }
      const { item } = data;

      const restrictedZoneIds = new Set(
        item.appearanceOn.restrictedZones.map((z) => z.id)
      );
      restrictedZoneIds.add(zone.id);

      // Add a zone record to the Apollo cache, in case it's not there yet!
      client.writeFragment({
        id: `Zone:${zone.id}`,
        fragment: gql`
          fragment HackWriteZone on Zone {
            id
          }
        `,
        data: { __typename: "Zone", id: zone.id },
      });

      client.writeFragment({
        id: `ItemAppearance:${item.appearanceOn.id}`,
        fragment: gql`
          fragment HackDTIAddRestrictedZoneWrite on ItemAppearance {
            restrictedZones
          }
        `,
        data: {
          restrictedZones: [...restrictedZoneIds].map((id) => ({
            __ref: `Zone:${id}`,
          })),
        },
      });

      console.log(
        `Added restricted zone ${zone.id} to item ${itemId} ` +
          `(now it's zones ${[...restrictedZoneIds].join(", ")})`
      );
    },
    [client, outfitState]
  );
  useExposedGlobal("DTIHackRestrictedZoneAdd", DTIHackRestrictedZoneAdd);

  /**
   * DTIHackRestrictedZoneRemove temporarily un-restricts the given zone on the
   * given item, on your machine only. It resets once you reload the page. This
   * can be useful for testing alternate restrictions, when making bug reports
   * to TNT!
   *
   * Note that, due to hacky limitations on how we currently store data in the
   * app, these changes will only apply to the species/color of your current
   * outfit. Other pets will still have the default restrictions, unless you
   * hack them separately.
   *
   * Arguments:
   *   - itemId: The "Item ID" of the item to change.
   *   - zoneIdOrName: The ID or the name of the zone to un-restrict. (If
   *                   there's more than one zone matching the name, we use the
   *                   one with the smaller ID number.)
   */
  const DTIHackRestrictedZoneRemove = React.useCallback(
    (itemId, zoneIdOrName, { force = false } = {}) => {
      const zone = findZone(zoneIdOrName, force);

      // TODO: This stuff makes it a bit annoying that we put restricts on the
      //       appearance instead of the item in the GraphQL API... could move!
      const data = client.readQuery({
        query: gql`
          query DTIHackRestrictedZoneRemoveRead(
            $itemId: ID!
            $speciesId: ID!
            $colorId: ID!
          ) {
            item(id: $itemId) {
              id
              appearanceOn(speciesId: $speciesId, colorId: $colorId) {
                id
                restrictedZones {
                  id
                }
              }
            }
          }
        `,
        variables: {
          itemId,
          speciesId: outfitState.speciesId,
          colorId: outfitState.colorId,
        },
      });
      if (!data && !force) {
        throw new Error(
          `no item found with ID ${JSON.stringify(itemId)}. ` +
            `is it loaded in the outfit yet? ` +
            `call again with {force: true} to do it anyway!`
        );
      }
      const { item } = data;

      const restrictedZoneIds = new Set(
        item.appearanceOn.restrictedZones.map((z) => z.id)
      );
      if (!restrictedZoneIds.has(String(zone.id)) && !force) {
        throw new Error(
          `zone ${JSON.stringify(zoneIdOrName)} is not restricted. ` +
            `(restricted zones: ${[...restrictedZoneIds].join(", ")}). ` +
            `call again with {force: true} to do it anyway!`
        );
      }
      restrictedZoneIds.delete(zone.id);

      client.writeFragment({
        id: `ItemAppearance:${item.appearanceOn.id}`,
        fragment: gql`
          fragment HackDTIRemoveRestrictedZoneWrite on ItemAppearance {
            restrictedZones
          }
        `,
        data: {
          restrictedZones: [...restrictedZoneIds].map((id) => ({
            __ref: `Zone:${id}`,
          })),
        },
      });

      console.log(
        `Removed restricted zone ${zone.id} from item ${itemId} ` +
          `(now it's zones ${[...restrictedZoneIds].join(", ")})`
      );
    },
    [client, outfitState]
  );
  useExposedGlobal("DTIHackRestrictedZoneRemove", DTIHackRestrictedZoneRemove);

  return null;
}

/**
 * useExposedGlobal sets window[name] to the given value, while this component
 * is mounted. Afterwards, it resets to the previous value, from before the
 * component mounted.
 *
 * This means you can access it from the dev console!
 */
function useExposedGlobal(name, value) {
  React.useEffect(() => {
    const prev = window[name];
    window[name] = value;
    return () => {
      window[name] = prev;
    };
  }, [name, value]);
}

function findZone(zoneIdOrName, force) {
  const zone = zones.find(
    (z) => z.id === String(zoneIdOrName) || z.label === zoneIdOrName
  );
  if (!zone && !force) {
    throw new Error(
      `no zone found with ID or name ${JSON.stringify(zoneIdOrName)}. ` +
        `call again with {force: true} to do it anyway!`
    );
  }
  return zone;
}

export default WardrobeDevHacks;
