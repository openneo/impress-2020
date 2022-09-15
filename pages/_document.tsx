import { ColorModeScript } from "@chakra-ui/react";
import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="favicon-16x16.png"
          />
          <meta name="theme-color" content="#000000" />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/apple-touch-icon.png"
          />
          <style
            type="text/css"
            dangerouslySetInnerHTML={{
              __html: `
      /* A font by Jos Buivenga (exljbris) -> www.exljbris.com */
      @font-face {
        font-family: "Delicious";
        font-display: block; /* used for large-but-late subheadings */
        font-weight: 700;
        src: url(/fonts/Delicious-Bold.otf);
      }

      @font-face {
        font-family: "Delicious";
        font-display: swap; /* used for page titles */
        font-weight: 800 1000;
        src: url(/fonts/Delicious-Heavy.otf);
      }
    `,
            }}
          />
          <script
            async
            defer
            data-domain="impress-2020.openneo.net"
            src="https://plausible.io/js/plausible.js"
            dangerouslySetInnerHTML={{ __html: `` }}
          />
          <link
            rel="preload"
            href="/fonts/Delicious-Heavy.otf"
            type="font/otf"
            as="font"
            crossOrigin=""
          />
          <link
            rel="preload"
            href="/fonts/Delicious-Bold.otf"
            type="font/otf"
            as="font"
            crossOrigin=""
          />
          <ColorModeScript initialColorMode="light" />
          <noscript>You need to enable JavaScript to run this app.</noscript>
        </Head>

        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
