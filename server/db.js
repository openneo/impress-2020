require("dotenv").config();
const mysql = require("mysql2/promise");

async function connectToDb() {
  const db = await mysql.createConnection({
    host: "impress.openneo.net",
    user: process.env["IMPRESS_MYSQL_USER"],
    password: process.env["IMPRESS_MYSQL_PASSWORD"],
    database: "openneo_impress",
  });

  return db;
}

module.exports = connectToDb;
