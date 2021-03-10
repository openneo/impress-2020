const fsp = require("fs").promises;
const path = require("path");

const argv = require("yargs").argv;
const inquirer = require("inquirer");

const connectToDb = require("../src/server/db");

async function findUser(db, usernameOrEmail) {
  const [
    rows,
    _,
  ] = await db.execute(
    "SELECT * FROM openneo_id.users WHERE name = ? OR email = ? LIMIT 1",
    [usernameOrEmail, usernameOrEmail]
  );
  if (rows.length === 0) {
    throw new Error("user not found");
  }

  const user = rows[0];
  console.log(`Name: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Sign in count: ${user.sign_in_count}`);
  console.log(`Last sign in: ${user.last_sign_in_at}`);

  return user;
}

async function main() {
  const [usernameOrEmail] = argv._;

  const { user, password } = await inquirer.prompt([
    { name: "user", message: "MySQL admin user:" },
    { name: "password", type: "password" },
  ]);
  const db = await connectToDb({ user, password });

  console.log("Loading ID user...");
  const idUser = await findUser(db, usernameOrEmail);
  console.log("Loading Impress user...");
  const impressUser = await findImpressUser(db, idUser.id);

  console.log("Loading other user data... (1)");
  const [
    closetHangers,
    closetLists,
    contributions,
    neopetsConnections,
    outfits,
  ] = await Promise.all([
    findAllForUser(db, impressUser.id, "closet_hangers"),
    findAllForUser(db, impressUser.id, "closet_lists"),
    findAllForUser(db, impressUser.id, "contributions"),
    findAllForUser(db, impressUser.id, "neopets_connections"),
    findAllForUser(db, impressUser.id, "outfits"),
  ]);

  console.log("Loading other user data... (2)");
  const itemOutfitRelationships = await findAllForOutfits(
    db,
    outfits.map((o) => o.id),
    "item_outfit_relationships"
  );

  const userDataToExport = {
    idUser,
    impressUser,
    closetHangers,
    closetLists,
    contributions,
    neopetsConnections,
    outfits,
    itemOutfitRelationships,
  };

  const userDataToExportAsJson = JSON.stringify(userDataToExport, null, 4);
  const userDataFilePath = path.join(
    __dirname,
    "exported-user-data",
    `${idUser.name}-${Date.now()}.json`
  );
  await fsp.writeFile(userDataFilePath, userDataToExportAsJson, "utf8");
  console.log(`Wrote to ${userDataFilePath}.`);

  const { shouldDelete } = await inquirer.prompt([
    {
      type: "confirm",
      default: false,
      name: "shouldDelete",
      message: "Delete this user?",
    },
  ]);

  if (!shouldDelete) {
    console.log("Okay, we won't delete this user. Goodbye!");
    return;
  }

  const { shouldDeleteConfirm } = await inquirer.prompt([
    {
      type: "confirm",
      default: false,
      name: "shouldDeleteConfirm",
      message: "Are you sure?",
    },
  ]);

  if (!shouldDeleteConfirm) {
    console.log("Okay, we won't delete this user. Goodbye!");
    return;
  }

  await Promise.all([
    deleteAllForUser(db, impressUser.id, "closet_hangers"),
    deleteAllForUser(db, impressUser.id, "closet_lists"),
    deleteAllForUser(db, impressUser.id, "contributions"),
    deleteAllForUser(db, impressUser.id, "neopets_connections"),
    deleteAllForUser(db, impressUser.id, "outfits"),
    deleteAllForOutfits(
      db,
      outfits.map((o) => o.id),
      "item_outfit_relationships"
    ),
  ]);

  await deleteImpressUser(db, idUser.id);
  await deleteUser(db, idUser.id);
}

async function deleteUser(db, id) {
  const [
    results,
    _,
  ] = await db.execute("DELETE FROM openneo_id.users WHERE id = ? LIMIT 1", [
    id,
  ]);
  if (results.affectedRows === 0) {
    throw new Error("failed to delete impress user");
  }

  console.log(`  - Deleted user.`);
}

async function findImpressUser(db, remoteId) {
  const [
    rows,
    _,
  ] = await db.execute(
    "SELECT * FROM openneo_impress.users WHERE remote_id = ? LIMIT 1",
    [remoteId]
  );
  if (rows.length === 0) {
    throw new Error("impress user not found");
  }

  return rows[0];
}

async function deleteImpressUser(db, remoteId) {
  const [
    results,
    _,
  ] = await db.execute(
    "DELETE FROM openneo_impress.users WHERE remote_id = ? LIMIT 1",
    [remoteId]
  );
  if (results.affectedRows === 0) {
    throw new Error("failed to delete user");
  }

  console.log(`  - Deleted impress user.`);
}

async function findAllForUser(db, impressUserId, table) {
  const [
    rows,
    _,
  ] = await db.execute(
    `SELECT * FROM openneo_impress.${table} WHERE user_id = ?`,
    [impressUserId]
  );

  console.log(`  - Found ${rows.length} ${table}`);

  return rows;
}

async function deleteAllForUser(db, impressUserId, table) {
  const [
    results,
    _,
  ] = await db.execute(
    `DELETE FROM openneo_impress.${table} WHERE user_id = ?`,
    [impressUserId]
  );

  console.log(`  - Deleted ${results.affectedRows} ${table}`);
}

async function findAllForOutfits(db, outfitIds, table) {
  if (outfitIds.length === 0) {
    console.log(`  - Skipped searching for ${table}`);
    return [];
  }

  // mysql2 doesn't seem to have a way to interpolate an array into a prepared
  // statement, so we create placeholder "?"s in the query to fill in! This
  // keeps us safe from injections, while still being lightweight.
  const placeholders = outfitIds.map(() => "?").join(", ");

  const [
    rows,
    _,
  ] = await db.execute(
    `SELECT * FROM openneo_impress.${table} WHERE outfit_id IN (${placeholders})`,
    [...outfitIds]
  );

  console.log(`  - Found ${rows.length} ${table}`);

  return rows;
}

async function deleteAllForOutfits(db, outfitIds, table) {
  if (outfitIds.length === 0) {
    console.log(`  - Skipped deleting ${table}`);
    return [];
  }

  // mysql2 doesn't seem to have a way to interpolate an array into a prepared
  // statement, so we create placeholder "?"s in the query to fill in! This
  // keeps us safe from injections, while still being lightweight.
  const placeholders = outfitIds.map(() => "?").join(", ");

  const [
    results,
    _,
  ] = await db.execute(
    `DELETE FROM openneo_impress.${table} WHERE outfit_id IN (${placeholders})`,
    [...outfitIds]
  );

  console.log(`  - Deleted ${results.affectedRows} ${table}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit());
