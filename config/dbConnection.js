const { DATABASE, DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD } =
  process.env;

const mysql = require("mysql");

const conn = mysql.createConnection({
  host: DATABASE_HOST,
  user: DATABASE_USER,
  password: DATABASE_PASSWORD,
  database: DATABASE,
});

conn.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("MYSQL Connected...");
  }
});

module.exports = conn;
