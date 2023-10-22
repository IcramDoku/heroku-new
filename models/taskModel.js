const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  //taskID is auto-generated aka objectID 
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  name: { type: String, required: true },
  description: { type: String, default: "" }, //task Created
  assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], //array
  completed: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now },
  dueAt: { type: Date }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;