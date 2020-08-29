import * as React from "react";

/**
 * useSupportSecret returns the Support secret that the server requires for
 * Support actions... if the user has it set. For most users, this returns
 * nothing!
 *
 * To become a Support user, you visit /?supportSecret=..., which saves the
 * secret to your device.
 *
 * Note that this hook doesn't check that the secret is *correct*, so it's
 * possible that it will return an invalid secret. That's okay, because
 * the server checks the provided secret for each Support request.
 *
 * DEPRECATED: Use `useSupport` instead!
 */
function useSupportSecret() {
  return React.useMemo(() => localStorage.getItem("supportSecret"), []);
}

export function useIsSupportUser() {
  const supportSecret = useSupportSecret();
  return supportSecret != null;
}

export default useSupportSecret;
