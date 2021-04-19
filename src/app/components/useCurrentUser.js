import { useAuth0 } from "@auth0/auth0-react";

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

export default useCurrentUser;
