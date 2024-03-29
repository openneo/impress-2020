// This exports users from the MySQL database to Auth0.
//
// If you use the --since flag, we'll only include users whose OpenNeo ID
// records were updated (or created) since then. Or, the --username flag will
// filter for a single specific username. Otherwise, we'll include all users.
// (It's safe to re-run against users already imported; Auth0 will reject any
// duplicates!)
//
// This sorta creates a second copy of everyone's account, copied onto Auth0.
// We should be thoughtful about how we do the actual migration process!
//
// For now, we can run this whenever we want to make it _possible_ to log in
// with Auth0, even if things will be potentially out of sync, because traffic
// to Impress 2020 is just testers now anyway!
//
// The --upsert command will additionally *update* Auth0's copy of users, not
// just insert. I think I tried to do this early on and it used to reject
// upserts with custom password hashes? But now it seems to work! But I have it
// as a opt-in flag for now, in case I'm forgetting something 😅
const { argv } = require("yargs");
const { ManagementClient } = require("auth0");
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

  const db = await connectToDb({
    user: process.env.IMPRESS_MYSQL_SCRIPT_USER,
    password: process.env.IMPRESS_MYSQL_SCRIPT_PASSWORD,
  });

  const connections = await connectionsPromise;
  if (connections.length === 0) {
    throw new Error(`no connections found on the Auth0 account`);
  } else if (connections.length > 1) {
    throw new Error(
      `Not yet implemented: when there is more than one Auth0 connection, specify which one to use.`
    );
  }
  const connectionId = connections[0].id;

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
    db.end();
  }

  let i = 0;
  function importNextBatch() {
    if (i < users.length) {
      const batchStart = i;
      i += 1000;
      console.info(`Starting batch ${batchStart + 1}-${batchStart + 1000}`);

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

  console.info(`Sent ${users.length} users for import.`);
}

async function runAuth0ImportJob(usersBatchJson, connectionId, batchStart) {
  let job = await auth0.jobs.importUsersJob({
    connection_id: connectionId,
    users_json: usersBatchJson,
    send_completion_email: false, // we're watching the script!
    upsert: Boolean(argv.upsert),
  });
  console.info(
    `[Batch ${batchStart + 1}] Created import job ${job.id}. Waiting...`
  );

  while (job.status === "pending") {
    await pause(5000);
    job = await auth0.jobs.get({ id: job.id });
  }

  if (job.status !== "completed") {
    console.info(
      `[Batch ${batchStart + 1}] Unexpected job status: ${job.status}`
    );
    return;
  }

  const errorGroups = await auth0.jobs.errors({ id: job.id });
  console.info(
    `[Batch ${batchStart + 1}] Import job completed, ` +
      `${errorGroups.length} failed`
  );

  for (const { user, errors } of errorGroups) {
    for (const error of errors) {
      console.info(
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
