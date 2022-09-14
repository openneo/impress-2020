import mysql from "mysql2";

let globalDbs = new Map();

// We usually run against the production database, even in local testing,
// to easily test against real data. (Not a wise general practice, but fine
// for this low-stakes project and small dev team with mostly read-only
// operations!)
//
// But you can also specify `DB_ENV=development` to use a local database,
// which is especially helpful for end-to-end modeling testing.
const defaultOptions =
  process.env["DB_ENV"] === "development"
    ? {
        host: "localhost",
        user: "impress_2020_dev",
        password: "impress_2020_dev",
        database: "openneo_impress",
      }
    : {
        host: "impress.openneo.net",
        user: process.env["IMPRESS_MYSQL_USER"],
        password: process.env["IMPRESS_MYSQL_PASSWORD"],
        database: "openneo_impress",
      };

async function connectToDb({
  host = defaultOptions.host,
  user = defaultOptions.user,
  password = defaultOptions.password,
  database = defaultOptions.database,
} = {}) {
  if (globalDbs.has(host)) {
    return globalDbs.get(host);
  }

  const db = mysql
    .createPool({
      host,
      user,
      password,
      database,
      multipleStatements: true,
      connectionLimit: 10,
    })
    // We upgrade to promises here, instead of using the mysql2/promise import,
    // for compatibility with Honeycomb's automatic tracing.
    .promise();

  globalDbs.set(host, db);

  return db;
}

module.exports = connectToDb;
