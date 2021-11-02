import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <link rel="icon" type="image/png" sizes="32x32" href={`${process.env.PUBLIC_URL}/favicon-32x32.png`} />
          <link rel="icon" type="image/png" sizes="16x16" href={`${process.env.PUBLIC_URL}/favicon-16x16.png`} />
          <meta name="theme-color" content="#000000" />
          <link rel="apple-touch-icon" sizes="180x180" href={`${process.env.PUBLIC_URL}/apple-touch-icon.png`} />
          <style type="text/css" dangerouslySetInnerHTML={{ __html: `
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
    ` }} />
          <script async="" defer="" data-domain="impress-2020.openneo.net" src="https://plausible.io/js/plausible.js" dangerouslySetInnerHTML={{ __html: `` }} />
          <link rel="preload" href="/fonts/Delicious-Heavy.otf" type="font/otf" as="font" crossOrigin="" />
          <link rel="preload" href="/fonts/Delicious-Bold.otf" type="font/otf" as="font" crossOrigin="" />
          <script dangerouslySetInnerHTML={{ __html: `
      // HACK: This is copy-pasted output from Chakra's <ColorModeScript />. It
      //       initializes our color mode to match the system color mode. The
      //       component is built for a special Document element like in
      //       Next.js, but in create-react-app this is the best we can do!
      (function setColorModeVar(initialValue) {
        var mql = window.matchMedia("(prefers-color-scheme: dark)");
        var systemPreference = mql.matches ? "dark" : "light";
        var persistedPreference;

        try {
          persistedPreference = localStorage.getItem("chakra-ui-color-mode");
        } catch (error) {
          console.log(
            "Chakra UI: localStorage is not available. Color mode persistence might not work as expected"
          );
        }

        var isInStorage = typeof persistedPreference === "string";
        var colorMode;

        if (isInStorage) {
          colorMode = persistedPreference;
        } else {
          colorMode =
            initialValue === "system" ? systemPreference : initialValue;
        }

        if (colorMode) {
          var root = document.documentElement;
          root.style.setProperty("--chakra-ui-color-mode", colorMode);
        }
      })("system");
    ` }} />
          <noscript>You need to enable JavaScript to run this app.</noscript>
        </Head>
        
        <body>
          <Main />
          <NextScript />
          
        </body>
      </Html>
    )
  }
}

export default MyDocument      
