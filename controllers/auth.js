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

                // let mailSubject = "Mail Verification";
                // const randomToken = randomstring.generate();
                // let content =
                //   "<p>Hi" +
                //   req.body.name +
                //   ', Please <a href="http://localhost:5000/mail-verification?token=' +
                //   randomToken +
                //   '"> Verify</a> your Mail</p';

                // sendMail(req.body.email, mailSubject, content);

                // db.query(
                //   "UPDATE users SET token=? WHERE email=?",
                //   [randomToken, req.body.email],
                //   function (error, result, fields) {
                //     if (error) {
                //       res.status(400).json({
                //         success: false,
                //         message: err,
                //       });
                //     }
                //   }
                // );

                return res.status(200).json({
                  success: true,
                  message: "User has been registered",
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

  db.query(
    "SELECT * FROM users WHERE token=? limit 1",
    token,
    function (error, result, fields) {
      if (error) {
        console.log(error.message);
      }

      if (result.length > 0) {
        db.query(`UPDATE users SET token = null WHERE id = '${result[0].id}'`);

        return res.render("mail-verification", {
          message: "Mail Verified Successfully!",
        });
      } else {
        return res.render("404");
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
  const authToken = req.headers.authorization.split(" ")[1];
  const decode = jwt.verify(authToken, JWT_SECRET);

  db.query(
    "SELECT * FROM users WHERE id=?",
    decode.id,
    function (error, result, fields) {
      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: result[0],
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

module.exports = {
  register,
  verifyMail,
  login,
  getUser,
  forgetPassword,
  resetPasswordLoad,
  resetPassword,
};
