import React from "react";
import type { NextPageWithLayout } from "./_app";
// import App from '../src'

// next/dynamic is used to prevent breaking incompatibilities
// with SSR from window.SOME_VAR usage, if this is not used
// next/dynamic can be removed to take advantage of SSR/prerendering
import dynamic from "next/dynamic";

// try changing "ssr" to true below to test for incompatibilities, if
// no errors occur the above static import can be used instead and the
// below removed
const App = dynamic(() => import("../src/app/App"), { ssr: false });

const FallbackPage: NextPageWithLayout = () => {
  return <App />;
};

// This old fallback page uses App, which already has PageLayout built-in.
FallbackPage.renderWithLayout = (children: JSX.Element) => children;

export default FallbackPage;
