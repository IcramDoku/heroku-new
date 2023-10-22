const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt-nodejs");
const jwt = require("jsonwebtoken");
const User = require("../../models/userModel");
const crypto = require("crypto");

const generateSecretKey = () => {
  return crypto.randomBytes(64).toString("hex");
};

// Route for user registration
router.post("/create_user", async (req, res) => {
  try {
    const { username, password, email, confirmPassword } = req.body;

    //validate input
    if (!username || !password || !email) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required" });
    }
    //check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log("Username already exists");
      return res.status(409).json({ error: "Username already exists" });
    }
    //check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.log("Email already exists");
      return res.status(409).json({ error: "Email already exists" });
    }
    //If passwords don't match
    if (password != confirmPassword) {
      console.log("Passwords don't match");
      return res.status(400).json({ error: "Passwords don't match" });
    }

    //hash password before saving it
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({ username, password: hashedPassword, email });
    await user.save();

    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Route for user login (authentication)
router.post("/login_user", async (req, res) => {
  try {
    const { username, password } = req.body;

    //validate input
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username });

    //check if user exists
    if (!user) {
      console.log("Username does not exist");
      return res.status(401).json({ error: "Authentication failed" });
    }

    // Compare the input password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      // Generate and return a JWT token for authenticated requests
      const token = jwt.sign({ userId: user._id }, generateSecretKey(), {
        expiresIn: "1h",
      });
      return res.status(200).json({ message: "Login successful", token });
    } else {
      console.log("incorrect password");
      return res.status(401).json({ error: "Authentication failed" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

module.exports = router;