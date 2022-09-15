import Head from "next/head";
import type { AppProps } from "next/app";

export default function DTIApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Dress to Impress</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Component {...pageProps} />
    </>
  );
}
