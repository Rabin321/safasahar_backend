const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const mysql = require("mysql");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config({ path: "./.env" });

require("./config/dbConnection");

const userRouter = require("./routes/auth");
const webRouter = require("./routes/webRoute");

const app = express();

// const db = mysql.createConnection({
//   host: process.env.DATABASE_HOST,
//   user: process.env.DATABASE_USER,
//    ord: process.env.DATABASE_PASSWORD,
//   database: process.env.DATABASE,
// });

// db.connect((err) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log("MYSQL Connected...");
//   }
// });

const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

// app.use("/", (req, res) => {
//   return res.status(200).json({
//     success: true,
//     message: "Server is running successfully",
//   });
// });

app.use("/api", userRouter);
app.use("/", webRouter);

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";
  res.status(err.statusCode).json({
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
