import React from "react";
import { Box, Image, Wrap } from "@chakra-ui/core";
import gql from "graphql-tag";
import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";

import HangerSpinner from "./components/HangerSpinner";
import { Heading1 } from "./util";
import useCurrentUser from "./components/useCurrentUser";

function ItemsPage() {
  const { userId } = useParams();
  const currentUser = useCurrentUser();
  const isCurrentUser = currentUser.id === userId;

  const { loading, error, data } = useQuery(
    gql`
      query ItemsPage($userId: ID!) {
        user(id: $userId) {
          id
          username
          itemsTheyOwn {
            id
            name
            thumbnailUrl
          }
        }
      }
    `,
    { variables: { userId } }
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <HangerSpinner boxSize="48px" />
      </Box>
    );
  }

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  return (
    <Box maxWidth="800px" margin="0 auto">
      <Heading1 marginBottom="8">
        {isCurrentUser ? "Items you own" : `Items ${data.user.username} owns`}
      </Heading1>
      <Wrap justify="center">
        {data.user.itemsTheyOwn.map((item) => (
          <Box key={item.id} width="100px" textAlign="center">
            <Image
              src={item.thumbnailUrl}
              alt=""
              height="80px"
              width="80px"
              boxShadow="md"
              margin="0 auto"
            />
            {item.name}
          </Box>
        ))}
      </Wrap>
    </Box>
  );
}

export default ItemsPage;
