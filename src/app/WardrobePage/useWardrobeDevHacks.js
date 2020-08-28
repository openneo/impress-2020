import React from "react";
import gql from "graphql-tag";
import { useApolloClient } from "@apollo/client";

import zones from "../cached-data/zones.json";

/**
 * useWardrobeDevHacks adds some hacky dev tools to the browser console, by
 * attaching them to the global window object!
 *
 * This is for debug tools / hacky Support tools that don't really need a
 * fully-powered UI.
 */
function useWardrobeDevHacks() {
  const client = useApolloClient();

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
      const zone = zones.find(
        (z) => z.id === String(zoneIdOrName) || z.label === zoneIdOrName
      );
      if (!zone && !force) {
        throw new Error(
          `no zone found with ID or name ${JSON.stringify(zoneIdOrName)}. ` +
            `call again with {force: true} to do it anyway!`
        );
      }

      const data = client.readFragment({
        id: `AppearanceLayer:${layerId}`,
        fragment: gql`
          fragment HackReadAppearanceLayer on AppearanceLayer {
            zone {
              id
            }
          }
        `,
      });
      if (!data && !force) {
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
        `Updated layer ${layerId} to zone ${zone.id} (was ${data?.zone?.id})`
      );
    },
    [client]
  );
  useExposedGlobal("DTIHackLayerZone", DTIHackLayerZone);
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

export default useWardrobeDevHacks;
