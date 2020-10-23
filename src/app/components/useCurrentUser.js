import { useAuth0 } from "@auth0/auth0-react";

function useCurrentUser() {
  const { isLoading, isAuthenticated, user } = useAuth0();

  if (isLoading || !isAuthenticated) {
    return { id: null, username: null, isLoggedIn: false };
  }

  // NOTE: Users created correctly should have these attributes... but I'm
  //       coding defensively, because third-party integrations are always a
  //       bit of a thing, and I don't want failures to crash us!
  const id = user.sub?.match(/^auth0\|impress-([0-9]+)$/)?.[1];
  const username = user["https://oauth.impress-2020.openneo.net/username"];

  return { id, username, isLoggedIn: true };
}

export default useCurrentUser;
