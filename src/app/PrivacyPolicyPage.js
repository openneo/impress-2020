import React from "react";
import { css } from "emotion";
import { VStack } from "@chakra-ui/core";

import { Heading1, Heading2, Heading3 } from "./util";

function PrivacyPolicyPage() {
  return (
    <>
      <Heading1 marginBottom="4">Our privacy policy</Heading1>
      <VStack
        spacing="4"
        alignItems="flex-start"
        className={css`
          max-width: 800px;

          p {
            margin-bottom: 1em;
          }
          a {
            text-decoration: underline;
          }
          h2,
          h3 {
            margin-bottom: 0.5em;
          }
        `}
      >
        <section>
          <p>
            Hi, friends! Dress to Impress collects certain personal data. Here's
            how we use it!
          </p>
          <p>
            First off, we'll <em>never</em> sell your private data, ever. It'll
            only be available to you and our small trusted staff—and we'll only
            use it to serve you, or to operate the site.
          </p>
        </section>
        <section>
          <Heading2>Account management</Heading2>
          <p>
            While our <a href="https://impress.openneo.net/">classic app</a>{" "}
            uses its own authentication, the app you're using now uses a service
            called <a href="https://auth0.com/">Auth0</a> to manage account
            creation and login.
          </p>
          <p>
            We made this decision because authentication is difficult to write
            and maintain securely. We felt that Auth0 was the smoothest and most
            secure experience we could offer, especially as a small team of
            volunteers 😅
          </p>
          <p>
            <a href="https://auth0.com/legal/ss-tos">
              Auth0's terms of service
            </a>{" "}
            commit to treating your user data as confidential information, not
            to be shared with anyone else, and only to be used as part of Dress
            to Impress. (The details are in Sections 6 and 7!)
          </p>
          <p>
            When signing up, Auth0 will ask for a username, password, and email
            address. They store your password as a <em>hash</em> (which,
            colloquially, is like a one-way encryption), rather than as the
            plain password itself.
          </p>
          <p>
            Some user accounts were created before we moved to Auth0. For those
            users, we imported their accounts from our custom database into
            Auth0. This included username, password hash, and email address.
          </p>
        </section>
        <section>
          <Heading2>Analytics and logging</Heading2>
          <p>
            To understand how people use our site, we use a service called{" "}
            <a href="https://plausible.io/">Plausible</a>. Every time you visit
            a page, we send them a{" "}
            <a href="https://plausible.io/data-policy">
              small packet of information
            </a>
            .
          </p>
          <p>
            Plausible is a privacy-focused service. It doesn't store your IP
            address in a retrievable way, or add cookies to your browser, or
            track you across multiple websites or over time.{" "}
            <a href="https://plausible.io/data-policy">
              Here's their data policy.
            </a>
          </p>
          <p>
            We also use <a href="https://vercel.com/">Vercel</a> and{" "}
            <a href="https://www.fastly.com/">Fastly</a> for web hosting. They
            store aggregate usage logs for us, but not any
            personally-identifying data.
          </p>
        </section>
        <section>
          <Heading2>Creations and contributions</Heading2>
          <p>
            People use Dress to Impress to create, share, and communicate! Some
            of these things are public, some are private, and some are
            configurable.
          </p>
          <Heading3>Outfits</Heading3>
          <p>
            Outfits are the central creation on Dress to Impress: combining a
            pet with items to make something that looks nice!
          </p>
          <p>
            Users can log in and save outfits to their account. They can also
            share outfits by URL without logging in.
          </p>
          <p>
            When you save an outfit to your account, it's somewhat private, but
            somewhat public.
          </p>
          <p>
            It's private in the sense that there is no central place where
            another user can look up your list of outfits.
          </p>
          <p>
            But it's public in the sense that anyone with the URL can see
            it—and, because the URLs are based on a simple incrementing global
            outfit ID, it's easy to look up all the outfits on the site.
          </p>
          <p>
            We might change this in the future, to make the URLs hard to guess
            and <em>genuinely</em> private. Until then, we advise users to not
            to include sensitive data in the outfits they save to their account.
          </p>
          <Heading3>Item lists</Heading3>
          <p>
            Logged-in users can track the Neopets customization items they own
            and want, by saving item lists to their account.
          </p>
          <p>
            These lists are private by default, but can be configured to either
            be "public" or "trading" as well.
          </p>
          <p>
            The "public" status means that anyone who knows your Dress to
            Impress username, or item list URL, can see this list.
          </p>
          <p>
            The "trading" status includes the same visibility as "public", and
            additionally we'll advertise that you own/want this item on its
            public list of trades.
          </p>
          <Heading3>Modeling contributions</Heading3>
          <p>
            When a logged-in user enters their Neopets's name on the site, we
            look up that pet's public data on Neopets.com.
          </p>
          <p>
            Sometimes, this will download new public outfit data that we've
            never seen before. For example, you might show us a Draik (a species
            of Neopet) wearing a new item, and we don't have data for a Draik
            wearing that item yet.
          </p>
          <p>
            When that happens, we'll extract that specific piece of data from
            your pet's outfit, and save it to our database, for other users to
            mix and match into their own outfits. This process is called
            "modeling".
          </p>
          <p>
            When you model new data for us, it's separated from your pet. Users
            can't discover what pet modeled a certain piece of data, or what
            else that pet was wearing.
          </p>
          <p>
            But, if you're logged in when modeling, we'll publicly credit your
            account for the new "contribution". This will appear in a number of
            places, including a list of the most recent contributions, and it
            will add points to your account that contribute to a public high
            score list. This will publicly display your username.
          </p>
          <p>
            Right now, modeling contributions from logged-in users are always
            public. This is a limitation of our system, and we might change it
            in the future! For now, if you would like to have your public
            contributions removed from the site, please use the contact link at
            the bottom of the page.
          </p>
        </section>
      </VStack>
    </>
  );
}

export default PrivacyPolicyPage;
