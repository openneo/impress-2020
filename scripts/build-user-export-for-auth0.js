// This generates a JSON file to export our users into Auth0.
//
// This sorta creates a second copy of everyone's account, copied onto Auth0.
// We should be thoughtful about how we do the actual migration process!
//
// For now, we can run this whenever we want to make it _possible_ to log in
// with Auth0, even if things will be potentially out of sync, because traffic
// to Impress 2020 is just testers now anyway!
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const inquirer = require("inquirer");

const connectToDb = require("../src/server/db");
const { normalizeRow } = require("../src/server/util");

async function main() {
  const { user, password, outputPath } = await inquirer.prompt([
    { name: "user", message: "MySQL admin user:" },
    { name: "password", type: "password" },
    {
      name: "outputPath",
      message: "Output path:",
      default: path.join(
        os.homedir(),
        "Downloads/openneo-users-for-auth0.json"
      ),
    },
  ]);
  const db = await connectToDb({ user, password });

  let users;
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, encrypted_password, password_salt
       FROM openneo_id.users ORDER BY id`
    );
    users = rows.map(normalizeRow);
  } finally {
    db.close();
  }

  const usersInAuth0Format = users.map((user) => ({
    user_id: user.id,
    username: user.name,
    email: user.email,
    custom_password_hash: {
      algorithm: "hmac",
      hash: {
        value: user.encryptedPassword,
        encoding: "hex",
        digest: "sha256",
        key: {
          encoding: "utf8",
          value: user.passwordSalt,
        },
      },
    },
  }));

  for (let i = 0; i < users.length; i += 1000) {
    const batchInAuth0Format = usersInAuth0Format.slice(i, i + 1000);
    const batchOutputPath = outputPath.replace(/\.json$/, `-${i}.json`);
    const jsonOutput = JSON.stringify(batchInAuth0Format);
    await fs.writeFile(batchOutputPath, jsonOutput);
    console.log(
      `📚 Wrote ${batchInAuth0Format.length} users to ${batchOutputPath}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit());
