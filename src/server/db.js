const mysql = require("mysql2/promise");

let globalDb;

async function connectToDb() {
  if (globalDb) {
    return globalDb;
  }

  globalDb = await mysql.createPool({
    connectionLimit: 5,
    host: "impress.openneo.net",
    user: process.env["IMPRESS_MYSQL_USER"],
    password: process.env["IMPRESS_MYSQL_PASSWORD"],
    database: "openneo_impress",
  });

  return globalDb;
}

module.exports = connectToDb;
