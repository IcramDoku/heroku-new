const express = require('express');
const authRoutes = require('./routes/api/userRoutes'); 
const groupRoutes = require('./routes/api/groupRoutes'); 
const taskRoutes = require('./routes/api/taskRoutes'); 
const getConnection = require("./config/db");
const cors = require("cors");
const dotEnv = require("dotenv");
const app = express();

const port = process.env.PORT || 3000

//registering middlewares
dotEnv.config(); //config with envirnment setup
app.use(express.json()); //for formatting
app.use(cors()); //needs cors to connect to frontend!!!

// Connect to MongoDB
getConnection();

// Use the auth routes
app.use('/auth', authRoutes);

// Group routes
app.use('/group',groupRoutes);

// Task routes
app.use('/task',taskRoutes);

// Print this out on the first window
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})