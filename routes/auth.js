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

const filefilter = (req, file, cb) => {
  file.mimetype == "image/jpeg" || file.mimetype == "image/png"
    ? cb(null, true)
    : cb(null, false);
};

const upload = multer({ storage: storage, fileFilter: filefilter });

const {
  signUpValidation,
  loginValidation,
  forgetValidation,
} = require("../helpers/validation");

const userController = require("../controllers/auth");

const auth = require("../middleware/auths");

// router.post("/register", signUpValidation, userController.register);
router.post("/register", upload.single("image"), userController.register);

// router.post("/login", loginValidation, userController.login);
router.post("/login", userController.login);

router.post("/associate-login", userController.associateLogin);

router.get("/get-user", userController.getUser);

router.post(
  "/forget-password",
  forgetValidation,
  userController.forgetPassword
);

router.post("/add-staff", upload.single("image"), userController.addStaff);
router.patch("/edit-staff", userController.editStaff);
router.get("/get-staff", userController.getStaff);
router.get("/get-staff-ward", userController.getStaffAccWard);

router.post("/add-dustbin", userController.addDustbin);
router.get("/get-dustbin", userController.getDustbin);
router.get("/get-filter-dustbin", userController.getDustbinFilter);
router.patch("/edit-dustbin", userController.editDustbin);
router.delete("/delete-dustbin", userController.deleteDustbin);
router.get("/dustbin-stats", userController.getDustbinStats);

router.post("/add-time", userController.addPickupTime);
router.get("/get-time", userController.getPickupTime);
router.get("/get-filter-time", userController.getPickupTimeFilter);
router.patch("/edit-time", userController.editTime);
router.delete("/delete-time", userController.deleteTime);

router.get("/stats", userController.getStats);

router.post("/create-payment", userController.createPayment);
router.get(
  "/khalti/callback",
  userController.handleKhaltiCallback,
  userController.createPayment
);

router.post(
  "/create-report",
  upload.single("image"),
  userController.createReport
);
router.get("/get-report", userController.getReport);
router.get("/get-filter-report", userController.getFilteredReport);

module.exports = router;
