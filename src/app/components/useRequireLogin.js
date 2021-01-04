import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

/**
 * useRequireLogin redirects to a login page, if the user is not already logged
 * in.
 *
 * Returns an object {isLoading: Boolean}, which is true if we're loading or
 * redirecting, or false if the user is logged in and we can proceed.
 */
function useRequireLogin() {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();

  const isRedirecting = !isLoading && !isAuthenticated;

  React.useEffect(() => {
    if (isRedirecting) {
      loginWithRedirect({
        redirectUri: window.location.href,
      });
    }
  }, [isRedirecting, loginWithRedirect]);

  // We tell the caller that we're "loading" even in the authenticated case,
  // because we want them to continue to show their loading state while we
  // redirect.
  return { isLoading: isLoading || isRedirecting };
}

export default useRequireLogin;
