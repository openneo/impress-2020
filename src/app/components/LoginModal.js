import {
  Box,
  Button,
  FormControl,
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
                <LoginForm />
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

function LoginForm() {
  const onSubmit = (e) => {
    e.preventDefault();
    alert("TODO: Log in!");
  };

  return (
    <form onSubmit={onSubmit}>
      <FormControl>
        <FormLabel>DTI Username</FormLabel>
        <Input type="text" />
        <FormHelperText>
          This is separate from your Neopets.com account.
        </FormHelperText>
      </FormControl>
      <Box height="4" />
      <FormControl>
        <FormLabel>DTI Password</FormLabel>
        <Input type="password" />
        <FormHelperText>
          Careful, never enter your Neopets password on another site!
        </FormHelperText>
      </FormControl>
      <Box marginTop="6" display="flex" alignItems="center">
        <Button size="sm" onClick={() => alert("TODO: Forgot password")}>
          Forgot password?
        </Button>
        <Box flex="1 0 auto" width="4" />
        <Button type="submit" colorScheme="green">
          Log in
        </Button>
      </Box>
    </form>
  );
}

function CreateAccountForm() {
  const onSubmit = (e) => {
    e.preventDefault();
    alert("TODO: Create account!");
  };

  return (
    <form onSubmit={onSubmit}>
      <FormControl>
        <FormLabel>DTI Username</FormLabel>
        <Input type="text" />
        <FormHelperText>
          This will be separate from your Neopets.com account.
        </FormHelperText>
      </FormControl>
      <Box height="4" />
      <FormControl>
        <FormLabel>DTI Password</FormLabel>
        <Input type="password" />
        <FormHelperText>
          Careful, never use your Neopets password for another site!
        </FormHelperText>
      </FormControl>
      <Box height="4" />
      <FormControl>
        <FormLabel>Confirm DTI Password</FormLabel>
        <Input type="password" />
        <FormHelperText>One more time, to make sure!</FormHelperText>
      </FormControl>
      <Box height="4" />
      <FormControl>
        <FormLabel>Email address</FormLabel>
        <Input type="password" />
        <FormHelperText>
          We'll use this in the future if you need to reset your password, or
          for us to contact you about your account. We won't sell this address,
          and we won't send marketing-y emails.
        </FormHelperText>
      </FormControl>
      <Box height="6" />
      <Box display="flex" justifyContent="flex-end">
        <Button type="submit" colorScheme="green">
          Create account
        </Button>
      </Box>
    </form>
  );
}
