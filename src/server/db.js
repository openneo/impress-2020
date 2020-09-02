const mysql = require("mysql2");

let globalDb;

async function connectToDb({
  user = process.env["IMPRESS_MYSQL_USER"],
  password = process.env["IMPRESS_MYSQL_PASSWORD"],
} = {}) {
  if (globalDb) {
    return globalDb;
  }

  globalDb = mysql
    .createConnection({
      host: "impress.openneo.net",
      user,
      password,
      database: "openneo_impress",
    })
    // We upgrade to promises here, instead of using the mysql2/promise import,
    // for compatibility with Honeycomb's automatic tracing.
    .promise();

  return globalDb;
}

module.exports = connectToDb;
