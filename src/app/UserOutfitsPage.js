import React from "react";
import { Box, Center } from "@chakra-ui/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

import { ErrorMessage, Heading1 } from "./util";
import HangerSpinner from "./components/HangerSpinner";
import useRequireLogin from "./components/useRequireLogin";

function UserOutfitsPage() {
  return (
    <Box>
      <Heading1>Your outfits</Heading1>
      <UserOutfitsPageContent />
    </Box>
  );
}

function UserOutfitsPageContent() {
  const { isLoading: userLoading } = useRequireLogin();

  const { loading: queryLoading, error, data } = useQuery(
    gql`
      query UserOutfitsPageContent {
        currentUser {
          outfits {
            id
            name
            petAppearance {
              id
            }
            wornItems {
              id
            }
          }
        }
      }
    `,
    { skip: userLoading }
  );

  if (userLoading || queryLoading) {
    return (
      <Center>
        <HangerSpinner />
      </Center>
    );
  }

  if (error) {
    return <ErrorMessage>Error loading outfits: {error.message}</ErrorMessage>;
  }

  return (
    <code>
      <pre>Data: {JSON.stringify(data, null, 4)}</pre>
    </code>
  );
}

export default UserOutfitsPage;
