const mongoose = require("mongoose");

const AllTasksSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
});

const AllTasks = mongoose.model("AllTasks", AllTasksSchema);

module.exports = AllTasks;