// This exports users from the MySQL database to Auth0.
//
// If you use the --since flag, we'll only include users whose OpenNeo ID
// records were updated (or created) since then. Or, the --username flag will
// filter for a single specific username. Otherwise, we'll include all users.
//
// This sorta creates a second copy of everyone's account, copied onto Auth0.
// We should be thoughtful about how we do the actual migration process!
//
// For now, we can run this whenever we want to make it _possible_ to log in
// with Auth0, even if things will be potentially out of sync, because traffic
// to Impress 2020 is just testers now anyway!
const { argv } = require("yargs");
const { ManagementClient } = require("auth0");
const inquirer = require("inquirer");
const PromisePool = require("es6-promise-pool");

const connectToDb = require("../src/server/db");
const { normalizeRow } = require("../src/server/util");

const auth0 = new ManagementClient({
  domain: "openneo.us.auth0.com",
  clientId: process.env.AUTH0_SUPPORT_CLIENT_ID,
  clientSecret: process.env.AUTH0_SUPPORT_CLIENT_SECRET,
  scope: "read:users update:users",
});

async function main() {
  const connectionsPromise = auth0.getConnections();

  const { user, password } = await inquirer.prompt([
    { name: "user", message: "MySQL admin user:" },
    { name: "password", type: "password" },
  ]);
  const db = await connectToDb({ user, password });

  const connections = await connectionsPromise;
  const { connectionId } = await inquirer.prompt([
    {
      name: "connectionId",
      type: "list",
      message: "Which Auth0 connection should we import to?",
      choices: connections.map((c) => ({ name: c.name, value: c.id })),
    },
  ]);

  let conditionSQL = "1";
  let conditionValues = [];
  if (argv.username) {
    conditionSQL = "oid.name = ?";
    conditionValues = [argv.username];
  } else if (argv.since) {
    conditionSQL = "oid.created_at >= ?";
    conditionValues = [argv.since];
  }

  let users;
  try {
    const [rows] = await db.query(
      `SELECT dti.id, oid.name, email, encrypted_password, password_salt
       FROM openneo_id.users oid
       INNER JOIN openneo_impress.users dti ON dti.remote_id = oid.id
       WHERE ${conditionSQL}
       ORDER BY dti.id`,
      conditionValues
    );
    users = rows.map(normalizeRow);
  } finally {
    db.close();
  }

  let i = 0;
  function importNextBatch() {
    if (i < users.length) {
      const batchStart = i;
      i += 1000;
      console.log(`Starting batch ${batchStart + 1}-${batchStart + 1000}`);

      const usersBatch = users.slice(batchStart, batchStart + 1000);
      const usersBatchJson = JSON.stringify(usersBatch.map(formatUserForAuth0));
      return runAuth0ImportJob(usersBatchJson, connectionId, batchStart);
    } else {
      return null;
    }
  }

  // Process two import jobs at a time, which is the max allowed by Auth0.
  const pool = new PromisePool(importNextBatch, 2);
  try {
    await pool.start();
  } catch (e) {
    console.error(e);
  }

  console.log(`Sent ${users.length} users for import.`);
}

async function runAuth0ImportJob(usersBatchJson, connectionId, batchStart) {
  let job = await auth0.jobs.importUsersJob({
    connection_id: connectionId,
    users_json: usersBatchJson,
    send_completion_email: false, // we're watching the script!
  });
  console.log(
    `[Batch ${batchStart + 1}] Created import job ${job.id}. Waiting...`
  );

  while (job.status === "pending") {
    await pause(5000);
    job = await auth0.jobs.get({ id: job.id });
  }

  if (job.status !== "completed") {
    console.log(
      `[Batch ${batchStart + 1}] Unexpected job status: ${job.status}`
    );
    return;
  }

  const errorGroups = await auth0.jobs.errors({ id: job.id });
  console.log(
    `[Batch ${batchStart + 1}] Import job completed, ` +
      `${errorGroups.length} failed`
  );

  for (const { user, errors } of errorGroups) {
    for (const error of errors) {
      console.log(
        `[Batch ${batchStart + 1}] User ${user.user_id} (${user.email}): ` +
          `${error.message}`
      );
    }
  }
}

function pause(delayMs) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), delayMs);
  });
}

function formatUserForAuth0(user) {
  const normalizedUsername = user.name.replace(
    /[^a-zA-Z0-9_+\-.!#$^`~@']/g,
    ""
  );
  if (normalizedUsername !== user.name) {
    console.warn(
      `WARN: Username ${user.name} (${user.email}) was not valid, changing to ${normalizedUsername}`
    );
  }

  return {
    user_id: `impress-${user.id}`,
    username: normalizedUsername,
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
  };
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit());
