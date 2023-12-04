var express = require("express");
var router = express.Router();
var Task = require("../../models/taskModel");
const User = require("../../models/userModel");
var Group = require("../../models/groupModel");
var AllTasks = require("../../models/AllTasksModel")

// Route to find the groupId for a given task and retrieve the members of the group
router.get("/group_members_for_task/:taskId", async (req, res) => {
  try {
    const taskId = req.params.taskId;

    // Step 1: Find the task by taskId
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Step 2: Get the groupId from the task
    const groupId = task.groupId;

    // Step 3: Find the group associated with the groupId
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Step 4: Retrieve the members of the group
    const memberObjectIDs = group.members;

    // Fetch the usernames for the User ObjectIDs
    const membersWithUsernames = await User.find({
      _id: { $in: memberObjectIDs },
    });

    // Extract usernames from the user documents
    const usernames = membersWithUsernames.map((user) => user.username);

    res.status(200).json(usernames);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Put route to add a selected member to a task
router.put("/add_member_to_task/:taskId/:memberUsername", async (req, res) => {
  console.log(req.body);
  try {
    const taskId = req.params.taskId;
    const username = req.params.memberUsername;
    const user = await User.findOne({ username: username });
    await Task.updateOne(
      { _id: taskId },
      { $addToSet: { assignedUsers: username } }
    );

    // Fetch the task
    const task = await Task.findOne({ _id: taskId });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Extract the groupId from the task
    const groupId = task.groupId;
    const userId = user._id;

    // Create a new entry in the AllTasks collection
    const allTasks = new AllTasks({
      userId,
      groupId,
      taskId,
    });
    
    await allTasks.save();
    res.status(201).json({ message: "Successfuly assigned user to task" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT route to remove/delete a selected member from a task
router.put("/remove_member_to_task/:taskId/:memberUsername",
  async (req, res) => {
    console.log(req.body);
    try {
      const taskId = req.params.taskId;
      const username = req.params.memberUsername;
      await Task.updateOne(
        { _id: taskId },
        { $pull: { assignedUsers: username } }
      );

      // Fetch the task and user
      const task = await Task.findOne({ _id: taskId });
      const user = await User.findOne({ username: username });

      // Delete the corresponding entry from AllTasks
      const deleteAllTasks = await AllTasks.deleteOne({ userId: user._id, taskId: taskId });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (deleteAllTasks.deletedCount === 0) {
        return res.status(404).json({ message: "AllTasks not found" });
      }

      res.status(201).json({ message: "Successfuly unassigned user from task" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

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
    console.log(taskData);
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
//Put request for changing if the task is completed or not
router.put("/toggle_finish_task/:taskID", async (req, res) => {
  try {
    const taskID = req.params.taskID;
    const { completed } = req.body;

    // Find the task by taskId and update it
    const updatedTask = await Task.findByIdAndUpdate(taskID, {
      completed: !completed, // Toggles the completed status
    });

    res.status(200).json("Task updated successfully");
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

    // Delete the task form all the users assigned this task 
    const deleteTask = await AllTasks.deleteMany({taskId: taskId})

    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Define a route to retrieve all values with the userId for all tasks
router.get("/get_all_tasks/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userId = user._id;

    // Use Mongoose to query the database for tasks with the specified userId
    const tasks = await AllTasks.find({ userId: userId });

    if (tasks) {
      const taskDetails = [];
      
      // Loop through each task and fetch its details
      for (const task of tasks) {
        const taskDetail = await Task.findOne({ _id: task.taskId });
        taskDetails.push(taskDetail);
      }

      res.json(taskDetails);
    } else {
      res.status(404).json({ message: "No tasks found for the given userId" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
