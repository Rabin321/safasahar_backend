const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");

const db = require("../config/dbConnection");

const randomstring = require("randomstring");

const sendMail = require("../helpers/sendMail");

const { JWT_SECRET } = process.env;

// const db = mysql.createConnection({
//   host: process.env.DATABASE_HOST,
//   user: process.env.DATABASE_USER,
//   password: process.env.DATABASE_PASSWORD,
//   database: process.env.DATABASE,
// });

const register = (req, res) => {
  // const errors = validationResult(req);

  // if (!errors.isEmpty()) {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Enter all the fields",
  //   });
  // }

  db.query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER(${db.escape(
      req.body.email
    )})`,
    (err, result) => {
      if (result && result.length) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      } else {
        bcrypt.hash(req.body.password, 8, (err, hash) => {
          if (err) {
            return res.status(400).json({
              success: false,
              message: err,
            });
          } else {
            db.query(
              `INSERT INTO users (name, email, password) VALUES ('${
                req.body.name
              }',${db.escape(req.body.email)}, ${db.escape(hash)})`,
              (err, result) => {
                if (err) {
                  return res.status(400).json({
                    success: false,
                    message: err,
                  });
                }

                let mailSubject = "Mail Verification";
                const randomToken = randomstring.generate();
                let content =
                  "<p>Hi" +
                  req.body.name +
                  ', Please <a href="http://localhost:5000/mail-verification?token=' +
                  randomToken +
                  '"> Verify</a> your Mail</p';

                sendMail(req.body.email, mailSubject, content);

                db.query(
                  "UPDATE users SET token=? WHERE email=?",
                  [randomToken, req.body.email],
                  function (error, result, fields) {
                    if (error) {
                      res.status(400).json({
                        success: false,
                        message: err,
                      });
                    }
                  }
                );

                return res.status(200).json({
                  success: true,
                  message: "User has been registered",
                    token: randomToken // Send the token back to the client

                });
              }
            );
          }
        });
      }
    }
  );
};

const verifyMail = (req, res) => {
  const token = req.query.token;
  console.log("🚀 ~ verifyMail ~ token:", token);

  db.query(
    "SELECT * FROM users WHERE token=? limit 1",
    token,
    function (error, result, fields) {
      if (error) {
        console.log("hefwafafaewfllo");
        console.log(error.message);
      }
      if (result.length > 0) {
        db.query(
          `UPDATE users SET token = null, is_Verified = true WHERE id = '${result[0].id}'`
        );

        return res.render("mail-verification", {
          message: "Mail Verified Successfully!",
        });
      } else {
        return res.json({
          success: false,
          message: "Failed",
        });
      }
    }
  );
};

const login = (req, res) => {
  // const errors = validationResult(req);

  // if (!errors.isEmpty()) {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Enter all the fields",
  //   });
  // }

  db.query(
    `SELECT * FROM users WHERE email = ${db.escape(req.body.email)}`,
    (err, result) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err,
        });
      }
      if (!result.length) {
        return res.status(401).json({
          success: false,
          message: "Invalid Credentials",
        });
      }

      bcrypt.compare(
        req.body.password,
        result[0]["password"],
        (bErr, bResult) => {
          if (bErr) {
            return res.status(400).json({
              success: false,
              message: bErr,
            });
          }
          if (bResult) {
            const token = jwt.sign(
              { id: result[0]["id"], is_admin: result[0]["is_admin"] },
              JWT_SECRET,
              { expiresIn: "1h" }
            );
            // db.query(`UPDATE users SET last_login = now() WHERE id='${result[0]["id"]}'`)
            return res.status(200).json({
              success: true,
              data: result[0],
              token,
              message: "Logged In",
            });
          }
          return res.status(401).json({
            success: false,
            message: "Invalid Credentials",
          });
        }
      );
    }
  );
};

const getUser = (req, res) => {
  const authToken = req.headers;
  // console.log("🚀 ~ getUser ~ authToken:", authToken);
  // const decode = jwt.verify(authToken, JWT_SECRET);

  db.query(
    "SELECT * FROM users WHERE role NOT IN ('admin', 'staff') AND is_Staff = false AND is_Admin = false",
    // [decode.id],
    function (error, result, fields) {
      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: result,
      });
    }
  );
};

const forgetPassword = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Enter all the fields",
    });
  }

  const email = req.body.email;
  db.query(
    "SELECT * FROM users WHERE email=? limit 1",
    email,
    function (error, result, fields) {
      if (error) {
        return res.status(400).json({
          message: error,
        });
      }

      if (result.length > 0) {
        let mailSubject = "Forget Password";

        const randomString = randomstring.generate();
        let content =
          "<p>Hi," +
          result[0].name +
          ' \
          Please <a href="http://localhost:5000/reset-password?token=' +
          randomString +
          '">Click Here</a> to reset your password</p>\
        ';

        sendMail(email, mailSubject, content);

        db.query(
          `DELETE FROM password_resets WHERE email=${db.escape(
            result[0].email
          )}`
        );

        db.query(
          `INSERT INTO password_resets (email, token) VALUES (${db.escape(
            result[0].email
          )}, '${randomString}')`
        );

        return res.status(200).json({
          message: "Mail Sent Successfully",
        });
      }
      return res.status(401).json({
        message: "Email doesn't exists!",
      });
    }
  );
};

const resetPasswordLoad = (req, res) => {
  try {
    const token = req.query.token;
    if (token === undefined) {
      res.render("404");
    }
    db.query(
      `SELECT * FROM password_resets WHERE token=? limit 1`,
      token,
      function (error, result, fields) {
        if (error) {
          console.log(error);
        }

        if (result !== undefined && result.length > 0) {
          db.query(
            "SELECT * FROM users WHERE email=? limit 1",
            result[0].email,
            function (error, result, fields) {
              if (error) {
                console.log(error);
              }

              res.render("reset-password", {
                user: result[0],
              });
            }
          );
        } else {
          res.render("404");
        }
      }
    );
  } catch (error) {
    console.log(error.message);
  }
};

const resetPassword = (req, res) => {
  if (req.body.password !== req.body.confirm_password) {
    res.render("reset-password", {
      error_message: "Password Not Matched",
      user: { id: req.body.user_id, email: req.body.email },
    });
  }

  bcrypt.hash(req.body.confirm_password, 8, (err, hash) => {
    if (err) {
      console.log(err);
    }

    db.query(`DELETE FROM password_resets WHERE email = '${req.body.email}'`);

    db.query(
      `UPDATE users SET password = '${hash}' WHERE id = '${req.body.user_id}'`
    );

    res.render("message", {
      message: "Password Reset Successfully!",
    });
  });
};

const addStaff = (req, res) => {
  try {
    // if (!req.user || req.user.is_Admin !== true) {
    //   return res
    //     .status(403)
    //     .json({ error: "Only administrators can add staff." });
    // }
    const { name, email, password, location, houseno, wardno, phone } =
      req.body;
    const newUser = {
      name,
      email,
      password, // Note: The password here should already be hashed in the req.body
      location,
      houseno,
      wardno,
      role: "staff",
      is_Admin: false,
      is_Staff: true,
      phone,
    };

    // Add the staff member to the database
    addUser(newUser)
      .then((insertedUserId) => {
        // Send a success response
        res
          .status(201)
          .json({ message: "Staff member added successfully.", user: newUser });
      })
      .catch((error) => {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const addUser = (user) => {
  return new Promise((resolve, reject) => {
    // Hash the password
    bcrypt.hash(user.password, 8, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        // Construct the SQL query to insert the user data
        const query = `
          INSERT INTO users 
          (name, email, password, location, houseno, wardno, role, is_Admin, is_Staff, phone) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
          user.name,
          user.email,
          hash, // Use the hashed password
          user.location,
          user.houseno,
          user.wardno,
          user.role,
          user.is_Admin,
          user.is_Staff,
          user.phone,
        ];

        // Execute the SQL query
        db.query(query, values, (error, results) => {
          if (error) {
            reject(error);
          } else {
            // Resolve the promise with the inserted user ID
            resolve(results.insertId);
          }
        });
      }
    });
  });
};

const getStaff = (req, res) => {
  try {
    const query =
      "SELECT * FROM users WHERE is_Staff = true AND role = 'staff'";

    db.query(query, (error, results) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ error: "Failed to fetch staff" });
      }

      return res.status(200).json({ success: true, staffMembers: results });
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  register,
  verifyMail,
  login,
  getUser,
  forgetPassword,
  resetPasswordLoad,
  resetPassword,
  addStaff,
  getStaff,
};
