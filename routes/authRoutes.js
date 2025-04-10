const express = require("express");
const router = express.Router();
const { registerInitiate, registerVerify, login, forgotPassword , resetPassword } = require("../controllers/authController");

  
// POST /api/auth/register
router.post("/register", registerInitiate);

//POST /api/auth/opt-verification
router.post("/opt-verification", registerVerify);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", resetPassword);

module.exports = router;
