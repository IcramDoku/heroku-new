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
      // Get overdue tasks for the specified user
      var today = new Date();
      // Get tasks due today for the specified user
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate());
      tomorrow.setHours(18, 59, 59, 999);
      console.log(tomorrow);

      const dueTodayTasks = await Task.find({
        assignedUsers: user.username,
        completed: false,
        dueAt: {
          $lt: tomorrow.toISOString(),
        },
      });

      if (user.username === 'icram') {
        console.log("Due today tasks:", dueTodayTasks);
        console.log("Number of tasks due today or overdue: ", dueTodayTasks.length);
      }

      // Combine overdue and due today tasks
      const tasksToNotify = [...dueTodayTasks];
      
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
