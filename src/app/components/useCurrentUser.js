import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useLocalStorage } from "../util";

function useCurrentUser() {
  const { isLoading, isAuthenticated, user } = useAuth0();

  // In development, you can start the server with
  // `IMPRESS_LOG_IN_AS=12345 vc dev` to simulate logging in as user 12345.
  //
  // This flag shouldn't be present in prod anyway, but the dev check is an
  // extra safety precaution!
  //
  // NOTE: In package.json, we forward the flag to REACT_APP_IMPRESS_LOG_IN_AS,
  //       because create-react-app only forwards flags with that prefix.
  if (
    process.env["NODE_ENV"] === "development" &&
    process.env["REACT_APP_IMPRESS_LOG_IN_AS"]
  ) {
    const id = process.env["REACT_APP_IMPRESS_LOG_IN_AS"];
    return {
      isLoading: false,
      isLoggedIn: true,
      id,
      username: `<Simulated User ${id}>`,
    };
  }

  // Additionally, our Cypress tests do an actual end-to-end login as a test
  // user. Use that token if present!
  const cypressUser = readCypressLoginData()?.decodedUser;
  if (cypressUser) {
    return { isLoading: false, isLoggedIn: true, ...getUserInfo(cypressUser) };
  }

  if (isLoading || !isAuthenticated) {
    return { isLoading, isLoggedIn: false, id: null, username: null };
  }

  return { isLoading, isLoggedIn: true, ...getUserInfo(user) };
}

export function readCypressLoginData() {
  const cypressUserJsonString = window.localStorage.getItem("auth0Cypress");
  if (!cypressUserJsonString) {
    return null;
  }

  try {
    return JSON.parse(cypressUserJsonString);
  } catch (e) {
    console.warn(
      "Could not parse auth0Cypress token in localStorage; ignoring."
    );
    return null;
  }
}

function getUserInfo(user) {
  return {
    id: user.sub?.match(/^auth0\|impress-([0-9]+)$/)?.[1],
    username: user["https://oauth.impress-2020.openneo.net/username"],
  };
}

/**
 * useLoginActions returns a `startLogin` function to start login with Auth0,
 * and a `logout` function to logout from whatever auth mode is in use.
 *
 * Note that `startLogin` is only supported with the Auth0 auto mode. In db
 * mode, you should open a `LoginModal` instead!
 */
export function useLoginActions() {
  const {
    loginWithRedirect: auth0StartLogin,
    logout: auth0Logout,
  } = useAuth0();
  const authMode = useAuthModeFeatureFlag();

  if (authMode === "auth0") {
    return { startLogin: auth0StartLogin, logout: auth0Logout };
  } else if (authMode === "db") {
    return {
      startLogin: () => {
        console.error(
          `Error: Cannot call startLogin in db login mode. Open a ` +
            `<LoginModal /> instead.`
        );
        alert(
          `Error: Cannot call startLogin in db login mode. Open a ` +
            `<LoginModal /> instead.`
        );
      },
      logout: () => {
        alert(`TODO: logout`);
      },
    };
  } else {
    console.error(`unexpected auth mode: ${JSON.stringify(authMode)}`);
    return { startLogin: () => {}, logout: () => {} };
  }
}

/**
 * useAuthModeFeatureFlag returns "auth0" by default, but "db" if you're trying
 * the new db-backed login mode.
 *
 * To set this manually, run `window.setAuthModeFeatureFlag("db")` in your
 * browser console.
 */
export function useAuthModeFeatureFlag() {
  // We'll probably add a like, experimental gradual rollout thing here too.
  // But for now we just check your device's local storage! (This is why we
  // default to `null` instead of "auth0", I want to be unambiguous that this
  // is the *absence* of a localStorage value, and not risk accidentally
  // setting this override value to auth0 on everyone's devices 😅)
  const [savedValue] = useLocalStorage("DTIAuthModeFeatureFlag", null);

  useEffect(() => {
    window.setAuthModeFeatureFlag = setAuthModeFeatureFlag;
  });

  if (!["auth0", "db", null].includes(savedValue)) {
    console.warn(
      `Unexpected DTIAuthModeFeatureFlag value: %o. Treating as null.`,
      savedValue
    );
    return null;
  }

  return savedValue || "auth0";
}

/**
 * setAuthModeFeatureFlag is mounted on the window, so you can call it from the
 * browser console to set this override manually.
 */
function setAuthModeFeatureFlag(newValue) {
  if (!["auth0", "db", null].includes(newValue)) {
    throw new Error(`Auth mode must be "auth0", "db", or null.`);
  }

  localStorage.setItem("DTIAuthModeFeatureFlag", JSON.stringify(newValue));

  // The useLocalStorage hook isn't *quite* good enough to catch this change.
  // Let's just reload the page lmao.
  window.location.reload();
}

export default useCurrentUser;
