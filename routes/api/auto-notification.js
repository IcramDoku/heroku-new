const User = require('../../models/userModel');
const Task = require("../../models/taskModel");
const nodemailer = require('nodemailer');

console.log("in auto-notifications")
// Create a transporter using your email service (e.g., Gmail)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  service: 'gmail',
  auth: {
    user: "the.task.meister.team@gmail.com",
    //App password from gmail
    pass: "srcv zckb snnj whkw",
  },
});

// Function to send task notifications
const sendTaskNotifications = async () => {
  try {
    // Fetch all users
    const users = await User.find();

    // Iterate over each user and send notifications
    for (const user of users) {
      // Get overdue tasks or tasks due today for the specified user
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      // MongoDB query for finding overdue tasks
      const overdueTasks = await Task.find({
        assignedUsers: user.username,
        completed: false,
        dueAt: { $lte: yesterday.toISOString() },
      });
      console.log("Overdue tasks (MongoDB):", overdueTasks);
      console.log("length: ", overdueTasks.length);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dueTodayTasks = await Task.find({
        assignedUsers: user.username,
        completed: false,
        dueAt: {
          $gte: today.toISOString(),
          $lt: tomorrow.toISOString(),
        },
      });
      console.log("Due today tasks:", dueTodayTasks);    
      console.log("length: ", dueTodayTasks.length); 

      // Combine overdue and due today tasks
      const tasksToNotify = [...overdueTasks, ...dueTodayTasks];
      
      // Sort tasks by due date in ascending order
      tasksToNotify.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

      // Send email notification if there are tasks to notify
      if (tasksToNotify.length > 0) {
        const mailOptions = {
          from: "Task Meister the.task.meister.team@gmail.com",
          to: user.email,
          subject: "Overdue and Due Today Tasks Notification",
          html: `
            <p>Hello ${user.username},</p>
            <p>You have the following tasks that are overdue or due today:</p>
            <ul>
              ${tasksToNotify
                .map(
                  (task) =>
                    `<li>${task.name} - Due Date: ${new Date(
                      task.dueAt
                    ).toLocaleDateString()}</li>`
                )
                .join("")}
            </ul>
            <p>Best regards,</p>
            <p>The Task Meister Team</p>
          `,
        };

        // Send email
        await transporter.sendMail(mailOptions);
      }
    }
  } catch (error) {
    console.error("Error notifying users:", error);
  }
};


// Export the function to be called separately
module.exports = { sendTaskNotifications };
