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

  if (isLoading || !isAuthenticated) {
    return { isLoading, isLoggedIn: false, id: null, username: null };
  }

  // NOTE: Users created correctly should have these attributes... but I'm
  //       coding defensively, because third-party integrations are always a
  //       bit of a thing, and I don't want failures to crash us!
  const id = user.sub?.match(/^auth0\|impress-([0-9]+)$/)?.[1];
  const username = user["https://oauth.impress-2020.openneo.net/username"];

  return { isLoading, isLoggedIn: true, id, username };
}

export default useCurrentUser;
