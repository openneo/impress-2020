// This is just a copy of our higher-level catch-all page.
// That way, /outfits/new renders as normal, but /outfits/:slug
// does the SSR thing!

// import NextIndexWrapper from '../../src'

// next/dynamic is used to prevent breaking incompatibilities
// with SSR from window.SOME_VAR usage, if this is not used
// next/dynamic can be removed to take advantage of SSR/prerendering
import dynamic from "next/dynamic";

// try changing "ssr" to true below to test for incompatibilities, if
// no errors occur the above static import can be used instead and the
// below removed
const App = dynamic(() => import("../../src/app/App"), { ssr: false });

export default function Page(props) {
  return <App {...props} />;
}
