import Head from "next/head";

import { Heading1 } from "./util";
import TextContent from "./components/TextContent";

import HomepageSplashImg from "./images/homepage-splash.png";
import Image from "next/image";
import { Box, useColorModeValue } from "@chakra-ui/react";
import { FeedbackForm, FeedbackFormContainer } from "./HomePage";

function StateOfDTI2022Page() {
  const formBorderColor = useColorModeValue("gray.300", "blue.400");
  return (
    <>
      <Head>
        <title>State of DTI: 2022 | Dress to Impress</title>
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
        State of DTI: 2022
      </Heading1>
      <TextContent maxWidth="700px" marginX="auto">
        <p>
          Hello, dear friends! I'm Matchu (they/she), the coder-person of Dress
          to Impress! Here's a little note about like… why the site is stuck
          where it is rn, and what we're thinking of doing about that.
        </p>
        <p>
          Dress to Impress started back in 2010, when I was in high school! I
          ran it alone for most of that time, but recently Chips and Dice from
          the /r/Neopets community have been helping keep on top of things, and
          it's been a serious game changer for keeping all our customization
          data accurate and reliable, thank you!!!
        </p>
        <p>
          I on the other hand have… <em>not</em> been on top of things 😅😖 My
          body has been uncooperative the past couple years (long covid seems
          likely, it's hard to say?), and about 70–80% of the way through
          development of the new site, my power just kinda… stopped. It's not a
          great situation for someone like that to be the only person holding
          the keys to the codebase, but, well, that's where we are.
        </p>
        <p>
          DTI 2020 started with three big goals in mind: supporting the new
          HTML5 customization system, working well on phones, and replacing some
          of the needlessly-complex tech I built back when I was like literally
          a teenager 😳 The first two got done, but it's hard to say we ever
          "replaced" anything: now we just have uhh <em>two</em> sites. We
          wanted to make everyone fall in love with DTI 2020 and be happy to let
          it smoothly replace Classic DTI by the end of 2020… but work stopped,
          so it never did.
        </p>
        <p>
          Not to mention that, since then, the world's been changing around us.
          As Neopets.com starts to maybe lose support from its parent company,
          and some of its technical infrastructure starts to become unstable,
          our top priority today is to make sure Neopets customization never
          becomes lost media. We used to depend on Neopets.com for hosting a LOT
          of the new HTML5 art, without keeping our own copy, but that's just
          not an option anymore—and I've put in a last big emergency oomph of
          effort to make sure we have everything we need, in case the site goes
          offline before anyone expects it to.
        </p>
        <p>
          And it's also all the more reason to move away from our complex
          Classic DTI tech, and onto something that's easy to distribute and run
          in the future, so the Neopets community isn't depending on our server
          and its old messy tech staying online for 20+ years. But that just
          never got done, and I wish it hadn't taken me two years to admit that
          I physically don't have the power to do it 😖
        </p>
        <p>
          So… that's the way of things. We built some support tech for Chips and
          Dice over the years, and they've been doing a great job keeping
          everything working, and I try to stay on top of the bugs they run
          into… but that's just all the coding power DTI has right now.
        </p>
        <p>
          If there's anyone out there who's had practice with React/Node apps,
          and is ready to spelunk into a codebase that was never really built
          for a team and try to finish up what's left, please send me a note at{" "}
          <a href="mailto:matchu@openneo.net">matchu@openneo.net</a> and I'd
          love to talk about it! 💜 It probably won't be easy work, but I know
          there's lots of folks who would be grateful.
        </p>
        <p>
          In the meantime, mostly just… thanks to everyone for being so kind to
          me over these, gosh, 12 years now. The Neopets community is where I
          grew up, and I'll do my best to help keep it alive in the coming
          decades, whatever form it may take! We deserve that.
        </p>
        <p>
          Best wishes in all things, Neopians,
          <br />—
          <Box as="span" fontStyle="italic">
            Matchu
          </Box>
        </p>
        <Box as="p" fontSize="sm">
          P.S. I've dropped the little feedback form element at the bottom of
          the page here too, so you can let me know if like… anything in here
          sounds especially right or wrong. I want to make sure I'm doing right
          by you, as best I can!
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

export default StateOfDTI2022Page;
