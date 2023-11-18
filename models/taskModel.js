const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  //taskID is auto-generated aka objectID
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  name: { type: String, required: true },
  description: { type: String, default: "" }, //task Created
  assignedUsers: [{ type: String, ref: "User" }], //array
  completed: { type: Boolean, default: false },
  //replace Date with String for date-type without the time; "YYYY-MM-DD"
  createdAt: { type: Date, default: Date.now }, 
  dueAt: { String: Date },
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;