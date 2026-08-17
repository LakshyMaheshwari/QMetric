const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../config/multer'); 

// Login Route
router.post('/login', (req, res, next) => {
  console.log(" Auth route /login hit");
  next();
}, authController.login);

// Register Route
router.post('/create-account', upload.single('collegeIdPhoto'), (req, res, next) => {
  console.log(" Auth route /create-account hit");
  next();
}, authController.register);

module.exports = router;
