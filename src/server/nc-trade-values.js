import LRU from "lru-cache";
import fetch from "node-fetch";

// NOTE: I didn't validate any of these cache settings very carefully, just
//       that the cache works basically at all. I figure if it's misconfigured
//       in a way that causes stale data or memory issues, we'll discover that
//       when it becomes a problem!
const owlsTradeValueCache = new LRU({
  // Cache up to 500 entries (they're small!), for 15 minutes each. (The 15min
  // cap should keep the cache much smaller than that in practice I think!)
  max: 500,
  ttl: 1000 * 60 * 15,

  // We also enforce a ~5MB total limit, just to make sure some kind of issue
  // in the API communication won't cause huge memory leaks. (Size in memory is
  // approximated as the length of the key string and the length of the value
  // object in JSON. Not exactly accurate, but very close!)
  maxSize: 5_000_000,
  sizeCalculation: (value, key) => JSON.stringify(value).length + key.length,
});

export async function getOWLSTradeValue(itemName) {
  const cachedValue = owlsTradeValueCache.get(itemName);
  if (cachedValue != null) {
    console.debug("[getOWLSTradeValue] Serving cached value", cachedValue);
    return cachedValue;
  }

  const newValue = await loadOWLSTradeValueFromAPI(itemName);
  owlsTradeValueCache.set(itemName, newValue);
  return newValue;
}

async function loadOWLSTradeValueFromAPI(itemName) {
  const res = await fetch(
    `https://neo-owls.net/itemdata/${encodeURIComponent(itemName)}`
  );
  if (!res.ok) {
    // TODO: Differentiate between 500 and 404. (Right now, when the item isn't
    // found, it returns a 500, so it's hard to say.)
    return null;
  }
  const data = await res.json();
  return {
    valueText: data.owls_value,
    lastUpdated: data.last_updated,
  };
}
