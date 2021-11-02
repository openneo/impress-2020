module.exports = {
  env: {
    PUBLIC_URL: "",
  },
  async redirects() {
    return [
      {
        source: "/user/:userId/closet",
        destination: "/user/:userId/lists",
        permanent: true,
      },
      {
        source: "/user/:userId/items",
        destination: "/user/:userId/lists",
        permanent: true,
      },
    ];
  },
};
