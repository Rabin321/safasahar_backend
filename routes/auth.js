const express = require("express");
const router = express.Router();

const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/images"));
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "-" + file.originalname;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  file.mimetype == "image/jpeg" || file.mimetype == "image/png"
    ? cb(null, true)
    : cb(null, false);
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

const {
  signUpValidation,
  loginValidation,
  forgetValidation,
} = require("../helpers/validation");

const userController = require("../controllers/auth");

const auth = require("../middleware/auths");

// router.post("/register", signUpValidation, userController.register);
router.post("/register", userController.register);

// router.post("/login", loginValidation, userController.login);
router.post("/login", userController.login);

router.get("/get-user", userController.getUser);

router.post(
  "/forget-password",
  forgetValidation,
  userController.forgetPassword
);

router.post("/add-staff", userController.addStaff);
router.get("/get-staff", userController.getStaff);

module.exports = router;
