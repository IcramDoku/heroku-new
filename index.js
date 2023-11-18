const express = require('express');
const authRoutes = require('./routes/api/userRoutes'); 
const groupRoutes = require('./routes/api/groupRoutes'); 
const taskRoutes = require('./routes/api/taskRoutes'); 
const getConnection = require("./config/db");
const cors = require("cors");
const cron = require('node-cron');
const { sendTaskNotifications } = require('./routes/api/auto-notification');
const dotEnv = require("dotenv");
const app = express();

const port = process.env.PORT || 3000

//registering middlewares
dotEnv.config(); //config with envirnment setup
app.use(express.json()); //for formatting
app.use(cors()); //needs cors to connect to frontend!!!

// Connect to MongoDB
getConnection();

// Print this out on the first window
app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Schedule the cron job to run every day at 8:00 AM in a specific time zone :'America/New_York'
cron.schedule('0 8 * * *', async () => {
  try {
    console.log('Cron job triggered at:', new Date().toLocaleString());
    await sendTaskNotifications();
  } catch (error) {
    console.error('Error in cron job:', error);
  }
}, { timezone: 'America/New_York' });

// Use the auth routes
app.use('/auth', authRoutes);

// Group routes
app.use('/group',groupRoutes);

// Task routes
app.use('/task',taskRoutes);

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})