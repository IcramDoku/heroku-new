const mongoose = require("mongoose");

const AllTasksSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
});

const AllTasks = mongoose.model("AllTasks", AllTasksSchema);

module.exports = AllTasks;
