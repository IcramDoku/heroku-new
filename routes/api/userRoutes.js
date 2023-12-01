const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/userModel");
const Task = require("../../models/taskModel");
const Group = require("../../models/groupModel");
const AllTasks = require("../../models/AllTasksModel")
const crypto = require("crypto");
const nodemailer = require('nodemailer');

//for password hashing
const generateSecretKey = () => {
  return crypto.randomBytes(64).toString("hex");
};

// for password recovery
const generateVerificationCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Create a transporter using your email service (e.g., Gmail)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  service: 'gmail',
  auth: {
    user: "the.task.meister.team@gmail.com",
    pass: "srcv zckb snnj whkw",
  },
});

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
    //check if email is valid
    var validEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (!validEmail.test(email)) {
      console.log("Invalid email");
      return res.status(409).json({ error: "Invalid email" });
    }
    //check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.log("Email already exists");
      return res.status(409).json({ error: "Email already exists" });
    }
    //check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log("Username already exists");
      return res.status(409).json({ error: "Username already exists" });
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
      return res.status(401).json({ error: "Incorrect Username or Password." });
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
      return res.status(401).json({ error: "Incorrect Username or Password." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Route to find email
router.get("/get_email/:username", async (req, res) => {
  const usernameID = req.params.username;
  try {
    const user = await User.findOne({ username: usernameID });

    if (!user) {
      // If user is not found, return an appropriate response
      return res.status(404).json({ error: "User not found" });
    }

    const email = user.email;

    // Return the email from this route
    res.json({ email });
  } catch (error) {
    console.error(error);
    // Handle other errors and return an appropriate response
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Express route to handle the deletion of a user and associated data
router.delete("/delete_user/:username", async (req, res) => {
  const usernameID = req.params.username;
  try {
    // Find the user by their username
    const user = await User.findOne({ username: usernameID });

    // Find all the groups owned by the user
    const ownedGroups = await Group.find({ owner: user._id });

    // Loop through each owned group for deletion
    for (const ownedGroup of ownedGroups) {
      // Remove all assigned users from tasks in the group
      await Task.updateMany({ groupId: ownedGroup._id }, { $set: { assignedUsers: [] } });
      // Remove all members from the members list in the group
      await Group.updateMany({ _id: ownedGroup._id }, { $set: { members: [] } });

      // Delete the tasks associated with the group
      await Task.deleteMany({ groupId: ownedGroup._id });
      // Delete all tasks associated with the group in AllTasks collection by group ID
      await AllTasks.deleteMany({ groupId: ownedGroup._id });
      // Delete the group itself
      await Group.findByIdAndRemove(ownedGroup._id);
    }

    // Remove the user from all groups and members they are associated with
    // Remove user from assigned users in all groups
    await Task.updateMany({}, { $pull: { assignedUsers: user.username } });
    // Remove user from the members list of all groups
    await Group.updateMany({}, { $pull: { members: user._id } });

    // Delete all tasks associated with the user in AllTasks collection by user ID
    await AllTasks.deleteMany({ userId: user._id });

    // Delete the actual user
    await User.deleteOne({ _id: user._id });

    // Respond with a success status
    res.status(204).send("Successfully deleted the user!");
  } catch (error) {
    // Handle errors and respond with a server error status
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// Step 1: Initiate password recovery process
router.post("/password_recovery", async (req, res) => {
  try {
    const { usernameOrEmail } = req.body;

    // Validate input
    if (!usernameOrEmail) {
      return res.status(400).json({ error: "Username and Email are required" });
    }

    // Find user by their unique value of username or email
    const user = await User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] });

    // Check if user exists
    if (!user) {
      console.log("Username or email does not exist");
      return res.status(401).json({ error: "Username or Email does not exist" });
    }

    // Generate and save a verification code in the user document
    const verificationCode = generateVerificationCode();
    user.verificationCode = verificationCode;
    await user.save();

    // Send verification code email using nodemailer
    const emailData = {
      to: user.email,
      from: 'Task Meister the.task.meister.team@gmail.com', 
      subject: 'Password Reset Verification Code',
      text: `Your verification code is: ${verificationCode}`,
      html: `<p>Hello,<br> Your verification code is: <b>${verificationCode}</b></p>`
    };

    await transporter.sendMail(emailData);

    return res.status(200).json({ message: "Verification code sent. Check your email for instructions." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Step 2: Validate verification code
router.post("/validate_verification_code", async (req, res) => {
  try {
    const { usernameOrEmail, verificationCode } = req.body;

    // Validate input
    if (!usernameOrEmail || !verificationCode) {
      return res.status(400).json({ error: "Username and Verification Code are required" });
    }

    // Find user by their unique value of username or email
    const user = await User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] });

    // Check if user exists
    if (!user) {
      console.log("Username or email does not exist");
      return res.status(401).json({ error: "Username or Email does not exist" });
    }

    // Check if the provided verification code matches the one in the user document
    if (user.verificationCode !== verificationCode) {
      console.log("Invalid verification code");
      return res.status(401).json({ error: "Invalid verification code" });
    }

    return res.status(200).json({ message: "Verification code is valid" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Step 3: Verify code and reset password
router.post("/verify_and_reset_password", async (req, res) => {
  try {
    const { usernameOrEmail, verificationCode, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!usernameOrEmail || !verificationCode || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "Username, Verification Code, and Password are required" });
    }

    // Find user by their unique value of username or email
    const user = await User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] });

    // Check if user exists
    if (!user) {
      console.log("Username or email does not exist");
      return res.status(401).json({ error: "Username or Email does not exist" });
    }

    // Check if the provided verification code matches the one in the user document
    if (user.verificationCode !== verificationCode) {
      console.log("Invalid verification code");
      return res.status(401).json({ error: "Invalid verification code" });
    }

    // Passwords don't match
    if (newPassword !== confirmPassword) {
      console.log("Passwords don't match");
      return res.status(400).json({ error: "Passwords don't match" });
    }

    // Hash the new password before saving it
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password and reset verification code
    user.password = hashedPassword;
    user.verificationCode = null; // Reset the verification code
    await user.save();

    // Send password updated email notification using nodemailer
    const emailData = {
      to: user.email,
      from: 'Task Meister the.task.meister.team@gmail.com',
      subject: 'Password Updated',
      text: `Your password has been successfully updated. If you didn't perform this action, please contact us.`,
      html: `<p>Hello,<br> Your password has been successfully updated. If you didn't perform this action, please contact us.</p>`
    };

    await transporter.sendMail(emailData);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

module.exports = router;
