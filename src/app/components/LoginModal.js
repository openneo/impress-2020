import { gql, useMutation } from "@apollo/client";
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@chakra-ui/react";
import React from "react";
import { ErrorMessage, getGraphQLErrorMessage } from "../util";
import WIPCallout from "./WIPCallout";

export default function LoginModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Welcome back to Dress to Impress! ✨</ModalHeader>
        <ModalCloseButton />
        <Tabs>
          <TabList>
            <Tab>Log in</Tab>
            <Tab>Create account</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <ModalBody>
                <LoginForm onSuccess={() => onClose()} />
              </ModalBody>
            </TabPanel>
            <TabPanel>
              <ModalBody>
                <CreateAccountForm />
              </ModalBody>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ModalContent>
    </Modal>
  );
}

function LoginForm({ onSuccess }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [
    sendLoginMutation,
    { loading, error, data, called, reset },
  ] = useMutation(
    gql`
      mutation LoginForm($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          id
        }
      }
    `,
    {
      update: (cache, { data }) => {
        // Evict the `currentUser` from the cache, which will force all queries
        // on the page that depend on it to update. (This includes the
        // GlobalHeader that shows who you're logged in as!)
        //
        // We also evict the user themself, to force-update things that we're
        // allowed to see about this user (e.g. private lists).
        //
        // I don't do any optimistic UI here, because auth is complex enough
        // that I'd rather only show login success after validating it through
        // an actual server round-trip.
        if (data.login?.id != null) {
          cache.evict({ id: "ROOT_QUERY", fieldName: "currentUser" });
          cache.evict({ id: `User:${data.login.id}` });
          cache.gc();
        }
      },
    }
  );

  const onSubmit = (e) => {
    e.preventDefault();
    sendLoginMutation({
      variables: { username, password },
    })
      .then(({ data }) => {
        if (data?.login != null) {
          onSuccess();
        }
      })
      .catch((e) => console.error(e)); // plus the error UI
  };

  return (
    <form onSubmit={onSubmit}>
      <FormControl>
        <FormLabel>DTI Username</FormLabel>
        <Input
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            reset();
          }}
        />
        <FormHelperText>
          This is separate from your Neopets.com account.
        </FormHelperText>
      </FormControl>
      <Box height="4" />
      <FormControl>
        <FormLabel>DTI Password</FormLabel>
        <Input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            reset();
          }}
        />
        <FormHelperText>
          Careful, never enter your Neopets password on another site!
        </FormHelperText>
      </FormControl>

      {error && (
        <ErrorMessage marginTop="4">
          Oops, login failed: "{getGraphQLErrorMessage(error)}". Try again?
        </ErrorMessage>
      )}

      {called && !loading && !error && data?.login == null && (
        <ErrorMessage marginTop="4">
          We couldn't find a match for that username and password. Try again?
        </ErrorMessage>
      )}

      <Box marginTop="6" display="flex" alignItems="center">
        <Button size="sm" onClick={() => alert("TODO: Forgot password")}>
          Forgot password?
        </Button>
        <Box flex="1 0 auto" width="4" />
        <Button type="submit" colorScheme="green" isLoading={loading}>
          Log in
        </Button>
      </Box>
    </form>
  );
}

function CreateAccountForm() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordConfirmation, setPasswordConfirmation] = React.useState("");
  const [email, setEmail] = React.useState("");

  const [
    sendCreateAccountMutation,
    { loading, error, data, reset },
  ] = useMutation(
    gql`
      mutation CreateAccountForm(
        $username: String!
        $password: String!
        $email: String!
      ) {
        createAccount(username: $username, password: $password, email: $email) {
          errors {
            type
          }
          user {
            id
          }
        }
      }
    `,
    {
      update: (cache, { data }) => {
        // If account creation succeeded, evict the `currentUser` from the
        // cache, which will force all queries on the page that depend on it to
        // update. (This includes the GlobalHeader that shows who you're logged
        // in as!)
        //
        // I don't do any optimistic UI here, because auth is complex enough
        // that I'd rather only show login success after validating it through
        // an actual server round-trip.
        if (data.createAccount?.user != null) {
          cache.evict({ id: "ROOT_QUERY", fieldName: "currentUser" });
          cache.gc();
        }
      },
    }
  );

  const onSubmit = (e) => {
    e.preventDefault();
    sendCreateAccountMutation({
      variables: { username, password, email },
    })
      .then(({ data }) => {
        if (data?.login != null) {
          onSuccess();
        }
      })
      .catch((e) => console.error(e)); // plus the error UI
  };

  const errorTypes = (data?.createAccount?.errors || []).map(
    (error) => error.type
  );

  const passwordsDontMatch =
    password !== "" && password !== passwordConfirmation;

  return (
    <form onSubmit={onSubmit}>
      <Box display="flex" justifyContent="center" marginBottom="3">
        <WIPCallout>TODO: This form isn't wired up yet!</WIPCallout>
      </Box>
      <FormControl isInvalid={errorTypes.includes("USERNAME_IS_REQUIRED")}>
        <FormLabel>DTI Username</FormLabel>
        <Input
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            reset();
          }}
        />
        <FormHelperText>
          This will be separate from your Neopets.com account.
        </FormHelperText>
        {errorTypes.includes("USERNAME_IS_REQUIRED") && (
          <FormErrorMessage>Username can't be blank</FormErrorMessage>
        )}
      </FormControl>
      <Box height="4" />
      <FormControl
        isInvalid={
          passwordsDontMatch || errorTypes.includes("PASSWORD_IS_REQUIRED")
        }
      >
        <FormLabel>DTI Password</FormLabel>
        <Input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            reset();
          }}
        />
        <FormHelperText>
          Careful, never use your Neopets password for another site!
        </FormHelperText>
        {errorTypes.includes("PASSWORD_IS_REQUIRED") && (
          <FormErrorMessage>Password can't be blank</FormErrorMessage>
        )}
      </FormControl>
      <Box height="4" />
      <FormControl isInvalid={passwordsDontMatch}>
        <FormLabel>Confirm DTI Password</FormLabel>
        <Input
          type="password"
          value={passwordConfirmation}
          onChange={(e) => {
            setPasswordConfirmation(e.target.value);
            reset();
          }}
        />
        <FormHelperText>One more time, to make sure!</FormHelperText>
      </FormControl>
      <Box height="4" />
      <FormControl
        isInvalid={
          errorTypes.includes("EMAIL_IS_REQUIRED") ||
          errorTypes.includes("EMAIL_MUST_BE_VALID")
        }
      >
        <FormLabel>Email address</FormLabel>
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            reset();
          }}
        />
        <FormHelperText>
          We'll use this in the future if you need to reset your password, or
          for us to contact you about your account. We won't sell this address,
          and we won't send marketing-y emails.
        </FormHelperText>
        {errorTypes.includes("EMAIL_IS_REQUIRED") && (
          <FormErrorMessage>Email can't be blank</FormErrorMessage>
        )}
        {errorTypes.includes("EMAIL_MUST_BE_VALID") && (
          <FormErrorMessage>Email must be valid</FormErrorMessage>
        )}
      </FormControl>
      {error && (
        <ErrorMessage marginTop="4">
          Oops, account creation failed: "{getGraphQLErrorMessage(error)}". Try
          again?
        </ErrorMessage>
      )}
      <Box height="6" />
      <Box display="flex" justifyContent="flex-end">
        <Button
          type="submit"
          colorScheme="green"
          isLoading={loading}
          isDisabled={
            username === "" ||
            password === "" ||
            email === "" ||
            passwordsDontMatch
          }
        >
          Create account
        </Button>
      </Box>
    </form>
  );
}
