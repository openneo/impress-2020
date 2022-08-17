import { gql, useQuery } from "@apollo/client";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useLocalStorage } from "../util";

const NOT_LOGGED_IN_USER = {
  isLoading: false,
  isLoggedIn: false,
  id: null,
  username: null,
};

function useCurrentUser() {
  const authMode = useAuthModeFeatureFlag();
  const currentUserViaAuth0 = useCurrentUserViaAuth0({
    isEnabled: authMode === "auth0",
  });
  const currentUserViaDb = useCurrentUserViaDb({
    isEnabled: authMode === "db",
  });

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
    return {
      isLoading: false,
      isLoggedIn: true,
      ...getUserInfoFromAuth0Data(cypressUser),
    };
  }

  if (authMode === "auth0") {
    return currentUserViaAuth0;
  } else if (authMode === "db") {
    return currentUserViaDb;
  } else {
    console.error(`Unexpected auth mode: ${JSON.stringify(authMode)}`);
    return NOT_LOGGED_IN_USER;
  }
}

function useCurrentUserViaAuth0({ isEnabled }) {
  // NOTE: I don't think we can actually, by the rule of hooks, *not* ask for
  //       Auth0 login state when `isEnabled` is false, because `useAuth0`
  //       doesn't accept a similar parameter to disable itself. We'll just
  //       accept the redundant network effort during rollout, then delete it
  //       when we're done. (So, the param isn't actually doing a whole lot; I
  //       mostly have it for consistency with `useCurrentUserViaDb`, to make
  //       it clear where the real difference is.)
  const { isLoading, isAuthenticated, user } = useAuth0();

  if (!isEnabled) {
    return NOT_LOGGED_IN_USER;
  } else if (isLoading) {
    return { ...NOT_LOGGED_IN_USER, isLoading: true };
  } else if (!isAuthenticated) {
    return NOT_LOGGED_IN_USER;
  } else {
    return {
      isLoading: false,
      isLoggedIn: true,
      ...getUserInfoFromAuth0Data(user),
    };
  }
}

function useCurrentUserViaDb({ isEnabled }) {
  const { loading, data } = useQuery(
    gql`
      query useCurrentUser {
        currentUser {
          id
          username
        }
      }
    `,
    {
      skip: !isEnabled,
      onError: (error) => {
        // On error, we don't report anything to the user, but we do keep a
        // record in the console. We figure that most errors are likely to be
        // solvable by retrying the login button and creating a new session,
        // which the user would do without an error prompt anyway; and if not,
        // they'll either get an error when they try, or they'll see their
        // login state continue to not work, which should be a clear hint that
        // something is wrong and they need to reach out.
        console.error("[useCurrentUser] Couldn't get current user:", error);
      },
      // We set this option so that, when we enter the loading state after
      // logging in and evicting `currentUser` from the cache, we'll see the
      // `loading: true` state. Otherwise, Apollo just leaves the return value
      // as-is until the new data comes in, so the user sees the logged-out
      // state until the behind-the-scenes update to this query finishes.
      notifyOnNetworkStatusChange: true,
    }
  );

  if (!isEnabled) {
    return NOT_LOGGED_IN_USER;
  } else if (loading) {
    return { ...NOT_LOGGED_IN_USER, isLoading: true };
  } else if (data?.currentUser == null) {
    return NOT_LOGGED_IN_USER;
  } else {
    return {
      isLoading: false,
      isLoggedIn: true,
      id: data.currentUser.id,
      username: data.currentUser.username,
    };
  }
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

function getUserInfoFromAuth0Data(user) {
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
  let [savedValue] = useLocalStorage("DTIAuthModeFeatureFlag", null);

  useEffect(() => {
    window.setAuthModeFeatureFlag = setAuthModeFeatureFlag;
  });

  if (!["auth0", "db", null].includes(savedValue)) {
    console.warn(
      `Unexpected DTIAuthModeFeatureFlag value: %o. Ignoring.`,
      savedValue
    );
    savedValue = null;
  }

  return savedValue || "auth0";
}

/**
 * getAuthModeFeatureFlag returns the authMode at the time it's called.
 * It's generally preferable to use `useAuthModeFeatureFlag` in a React
 * setting, but we use this instead for Apollo stuff!
 */
export function getAuthModeFeatureFlag() {
  const savedValueString = localStorage.getItem("DTIAuthModeFeatureFlag");

  let savedValue;
  try {
    savedValue = JSON.parse(savedValueString);
  } catch (error) {
    console.warn(`DTIAuthModeFeatureFlag was not valid JSON. Ignoring.`);
    savedValue = null;
  }

  if (!["auth0", "db", null].includes(savedValue)) {
    console.warn(
      `Unexpected DTIAuthModeFeatureFlag value: %o. Ignoring.`,
      savedValue
    );
    savedValue = null;
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
