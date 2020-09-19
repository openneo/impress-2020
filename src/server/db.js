const mysql = require("mysql2");

let globalDbs = new Map();

async function connectToDb({
  host = "impress.openneo.net",
  user = process.env["IMPRESS_MYSQL_USER"],
  password = process.env["IMPRESS_MYSQL_PASSWORD"],
  database = "openneo_impress",
} = {}) {
  if (globalDbs.has(host)) {
    return globalDbs.get(host);
  }

  const db = mysql
    .createConnection({
      host,
      user,
      password,
      database,
      multipleStatements: true,
    })
    // We upgrade to promises here, instead of using the mysql2/promise import,
    // for compatibility with Honeycomb's automatic tracing.
    .promise();

  globalDbs.set(host, db);

  return db;
}

module.exports = connectToDb;
