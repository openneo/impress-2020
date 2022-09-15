import React from "react";
import Head from "next/head";
import type { AppProps } from "next/app";
import type { NextPage } from "next";
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
import { Auth0Provider } from "@auth0/auth0-react";
import { CSSReset, ChakraProvider, extendTheme } from "@chakra-ui/react";
import { ApolloProvider } from "@apollo/client";
import { useAuth0 } from "@auth0/auth0-react";
import { mode } from "@chakra-ui/theme-tools";

import buildApolloClient from "../src/app/apolloClient";
import PageLayout from "../src/app/PageLayout";

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  layoutComponent?: (props: { children: JSX.Element }) => JSX.Element;
};

const theme = extendTheme({
  styles: {
    global: (props) => ({
      html: {
        // HACK: Chakra sets body as the relative position element, which is
        //       fine, except its `min-height: 100%` doesn't actually work
        //       unless paired with height on the root element too!
        height: "100%",
      },
      body: {
        background: mode("gray.50", "gray.800")(props),
        color: mode("green.800", "green.50")(props),
        transition: "all 0.25s",
      },
    }),
  },
});

type AppPropsWithLayout = AppProps & { Component: NextPageWithLayout };

export default function DTIApp({ Component, pageProps }: AppPropsWithLayout) {
  const LayoutComponent = Component.layoutComponent ?? PageLayout;

  React.useEffect(() => setupLogging(), []);

  return (
    <>
      <Head>
        <title>Dress to Impress</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Auth0Provider
        domain="openneo.us.auth0.com"
        clientId="8LjFauVox7shDxVufQqnviUIywMuuC4r"
        redirectUri={
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : "https://impress-2020.openneo.net"
        }
        audience="https://impress-2020.openneo.net/api"
        scope=""
      >
        <ApolloProviderWithAuth0>
          <ChakraProvider theme={theme}>
            <CSSReset />
            <LayoutComponent>
              <Component {...pageProps} />
            </LayoutComponent>
          </ChakraProvider>
        </ApolloProviderWithAuth0>
      </Auth0Provider>
    </>
  );
}

function ApolloProviderWithAuth0({ children }: { children: React.ReactNode }) {
  const auth0 = useAuth0();
  const auth0Ref = React.useRef(auth0);

  React.useEffect(() => {
    auth0Ref.current = auth0;
  }, [auth0]);

  const client = React.useMemo(
    () => buildApolloClient(() => auth0Ref.current),
    []
  );
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

function setupLogging() {
  Sentry.init({
    dsn:
      "https://c55875c3b0904264a1a99e5b741a221e@o506079.ingest.sentry.io/5595379",
    autoSessionTracking: true,
    integrations: [
      new Integrations.BrowserTracing({
        beforeNavigate: (context) => ({
          ...context,
          // Assume any path segment starting with a digit is an ID, and replace
          // it with `:id`. This will help group related routes in Sentry stats.
          // NOTE: I'm a bit uncertain about the timing on this for tracking
          //       client-side navs... but we now only track first-time
          //       pageloads, and it definitely works correctly for them!
          name: window.location.pathname.replaceAll(/\/[0-9][^/]*/g, "/:id"),
        }),

        // We have a _lot_ of location changes that don't actually signify useful
        // navigations, like in the wardrobe page. It could be useful to trace
        // them with better filtering someday, but frankly we don't use the perf
        // features besides Web Vitals right now, and those only get tracked on
        // first-time pageloads, anyway. So, don't track client-side navs!
        startTransactionOnLocationChange: false,
      }),
    ],
    denyUrls: [
      // Don't log errors that were probably triggered by extensions and not by
      // our own app. (Apparently Sentry's setting to ignore browser extension
      // errors doesn't do this anywhere near as consistently as I'd expect?)
      //
      // Adapted from https://gist.github.com/impressiver/5092952, as linked in
      // https://docs.sentry.io/platforms/javascript/configuration/filtering/.
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],

    // Since we're only tracking first-page loads and not navigations, 100%
    // sampling isn't actually so much! Tune down if it becomes a problem, tho.
    tracesSampleRate: 1.0,
  });
}
