const router = require("express").Router();
const UserController = require("./userController");

router.post("/register", UserController.userRegister);
router.post("/login", UserController.userLogin);

// Email Verification Routes
router.get("/verify-email", UserController.verifyEmail);
router.post("/verify-email", UserController.verifyEmail);

// Forgot & Reset Password Routes
router.post("/forgot-password", UserController.forgotPassword);
router.post("/reset-password", UserController.resetPassword);

module.exports = router;