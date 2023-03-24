import Head from "next/head";

import { Heading1 } from "./util";
import TextContent from "./components/TextContent";

import HomepageSplashImg from "./images/homepage-splash.png";
import Image from "next/image";
import { Box, useColorModeValue } from "@chakra-ui/react";
import { FeedbackForm, FeedbackFormContainer } from "./HomePage";

function StateOfDTI2023Page() {
  const formBorderColor = useColorModeValue("gray.300", "blue.400");
  return (
    <>
      <Head>
        <title>State of DTI: 2023 | Dress to Impress</title>
      </Head>
      <Box display="flex" justifyContent="center" marginBottom="3">
        <Image
          src={HomepageSplashImg}
          width={200}
          height={200}
          alt="Dress to Impress beach background"
          layout="fixed"
        />
      </Box>
      <Heading1 marginBottom="4" textAlign="center">
        State of DTI: 2023
      </Heading1>
      <TextContent maxWidth="700px" marginX="auto">
        <p>
          Hello, dear friends! I'm Matchu (they/she), the coder-person of Dress
          to Impress! Here's a little note about like… why the site is stuck
          where it is rn, and what we're thinking of doing about that.
        </p>
        <p>
          I started building DTI 2020 back when I was healthier, and was pretty
          sure I could finish it all up and transfer everything to the new site
          by the end of the year. The name made sense at the time! 😅 But, well,
          now I'm too sick too often to finish 😖 (Long covid? It's hard to
          say.)
        </p>
        <p>
          I'm happy we have a site that's much better on phones and works with
          the new HTML5 systems! But Classic DTI still has a lot of the
          essential item trading features and a few other nice things… so we're
          kinda just stuck with the two sites for now, I think 😬 We won't be
          making any improvements to Classic DTI anymore (changing it is a REAL
          pain), but we also won't turn it off until the day it's no longer
          needed, and that's… very far from today.
        </p>
        <p>
          For now, our technical focus is making sure all Neopets customization
          data is archived, in case Neopets servers become spottier or go
          offline. (We see the way the wind is blowing with the NFT Neopets
          project, so we want to be ready if the executives shut down
          Neopets.com, just in case.) And we have a small support team keeping
          an eye on things—thank you Chips and Dice for all your help!!
        </p>
        <p>
          But yeah, we're open to having more hands help finish DTI 2020! If you
          have practice with React/Node apps, and are eager to spelunk into a
          codebase that was unfortunately never really built for a team, please
          send me a note at{" "}
          <a href="mailto:matchu@openneo.net">matchu@openneo.net</a> and I'd
          love to talk about it! 💜 I'm not ready to offer the kind of hands-on
          support I normally would, so it's not really a fair ask on my part—but
          I know there's lots of folks who would be grateful, if it's something
          you can do.
        </p>
        <p>
          In the meantime, mostly just… thanks to everyone for being so kind to
          me over these, gosh, 12 years now. The Neopets community is where I
          grew up, and I'll do my best to help keep it alive in the coming
          decades, whatever form it may take. We deserve that.
        </p>
        <p>
          Best wishes in all things, Neopians 💖
          <br />—
          <Box as="span" fontStyle="italic">
            Matchu
          </Box>
        </p>
        <Box as="p" fontSize="sm">
          P.S. I've dropped our little feedback form at the bottom of the page
          here too, so you can let me know if like… anything in here sounds
          especially right or wrong. I want to make sure I'm doing right by you,
          as best I can!
        </Box>
      </TextContent>
      <Box maxWidth="500px" marginX="auto" marginTop="6">
        <FeedbackFormContainer borderColor={formBorderColor}>
          <FeedbackForm contentPlaceholder="Anything come to mind?" />
        </FeedbackFormContainer>
      </Box>
    </>
  );
}

export default StateOfDTI2023Page;
