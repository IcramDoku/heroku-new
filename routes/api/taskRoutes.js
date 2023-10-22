//Task Attributes
//Task ID : String
//Group ID : String
//Task Name : String
//Task Created : String
//Task Due : String
//Task Notes : String
//Completed : Bool
//Assigned ID : UserID[]
var express = require("express");
var router = express.Router();
var Task = require("../../models/taskModel");

//Post Request

//Get Request By GroupID
router.get("/get_task_group/:groupID", async (req, res) => {
  try {
    const groupID = req.params.groupID;
    const tasks = await Task.find({ groupId: groupID });
    return res.status(200).json(tasks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get Request By UserID
router.get("/get_task/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find tasks assigned to the specified user
    const tasks = await Task.find({ assignedUsers: userId }).populate(
      "groupId"
    );

    if (!tasks || tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found for the user" });
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

//Post Request for Task Creation
router.post("/create_task", async (req, res) => {
  console.log(req.body);
  try {
    const {
      groupId,
      name,
      description,
      assignedUsers,
      completed,
      createdAt,
      dueAt,
    } = req.body;
    const task = new Task({
      groupId,
      name,
      description,
      assignedUsers,
      completed,
      createdAt,
      dueAt,
    });
    await task.save();

    res.status(201).json({ message: "Task created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Put Request for Task Editing
router.put("/edit_task", async (req, res) => {
  try {
    const { _id, ...taskData } = req.body;
    console.log(taskData)
    // Find the task by taskId and update it
    const updatedTask = await Task.findByIdAndUpdate(
      _id,
      { $set: { ...taskData } },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Delete Request for Task Deleting
router.delete("/delete_task/:taskId", async (req, res) => {
  try {
    const taskId = req.params.taskId;

    // Find the task by taskId and delete it
    const deletedTask = await Task.findByIdAndDelete(taskId);

    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

module.exports = router;