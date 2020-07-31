import * as React from "react";

/**
 * SupportOnly only shows its contents to Support users. For most users, the
 * content will be hidden!
 *
 * To become a Support user, you visit /?supportSecret=..., which saves the
 * secret to your device.
 *
 * Note that this component doesn't check that the secret is *correct*, so it's
 * possible to view this UI by faking an invalid secret. That's okay, because
 * the server checks the provided secret for each Support request.
 */
function SupportOnly({ children }) {
  const supportSecret = React.useMemo(getSupportSecret, []);

  return supportSecret ? children : null;
}

function getSupportSecret() {
  return localStorage.getItem("supportSecret");
}

export default SupportOnly;
