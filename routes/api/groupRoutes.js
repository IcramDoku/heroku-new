var express = require("express");
var router = express.Router();
var Group = require("../../models/groupModel");
var User = require("../../models/userModel");
var Task = require("../../models/taskModel");
var AllTasks = require("../../models/AllTasksModel")

// GET request to retrieve a list groups that memberUsername is a part of
router.get("/get_groups/:username", async (req, res) => {
  const username = req.params.username;
  const user = await User.findOne({ username });
  try {
    const groups = await Group.find({ members: user._id }).populate(
      "name",
      "_id"
    );
    res.status(200).json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//Get request that checks if the userid we gave is the owner of the group
router.get("/check_owner/:username/:groupID", async (req, res) => {
  const username = req.params.username;
  const user = await User.findOne({ username: username });
  const groupID = req.params.groupID;
  const group = await Group.findOne({ _id: groupID });
  try {
    if (user._id.toString() == group.owner.toString()) {
      return res.status(201).json({ message: "User is owner" });
    } else {
      return res.status(201).json({ message: "User is not owner" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
//Put Request To Add A Member to a Group
router.put("/add_member/:username/:groupID", async (req, res) => {
  const username = req.params.username;
  const user = await User.findOne({ username: username });
  const groupID = req.params.groupID;
  try {
    await Group.updateOne(
      { _id: groupID },
      { $addToSet: { members: user._id } }
    );
    res.status(201).json({ message: "User added to the group successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//Put Request To Remove A Member from a Group
router.put("/remove_member/:username/:groupID", async (req, res) => {
  const username = req.params.username;
  const user = await User.findOne({ username: username });

  //stops the removal of owner from their own group
  const userID = user._id;
  const groupID = req.params.groupID
  const group = await Group.findOne({ _id: groupID });
  if(group.owner.equals(userID)) {
    return res.status(400).json({ error: "You cannot remove the owner" });
  }

  try {
    await Group.updateOne({ _id: groupID }, { $pull: { members: user._id } });
    await Task.updateMany(
      { groupId: groupID },
      { $pull: { assignedUsers: user.username } }
    );
    //when remove that member from the group, where both groupId and userId must match
    await AllTasks.deleteMany({ groupId: groupID, userId: userID })

    res
      .status(201)
      .json({ message: "User removed from the group successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//Post Request By Creating Group
router.post("/create_group", async (req, res) => {
  try {
    const { name, members } = req.body;

    //validate input
    if (!name) {
      return res.status(400).json({ error: "Group name is required" });
    }
    const memberIDs = [];
    //Turns all the member strings into ObjectIds
    for (const member of members) {
      const user = await User.findOne({ username: member });
      memberIDs.push(user._id);
    }
    const owner = memberIDs[0];
    //save group
    const group = new Group({ name, members: memberIDs, owner });
    await group.save();

    res.status(201).json({ message: "Group created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// GET request for displaying the members in the group
router.get("/get_group_members/:groupId", async (req, res) => {
  const groupID = req.params.groupId;
  try {
    const group = await Group.findById(groupID);

    // Get an array of User ObjectIDs from the group's members
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
    res.status(500).json({ message: "Server error" });
  }
});

// PUT request to edit the Group Name
router.put("/edit_group_name/:groupId/:groupName", async (req, res) => {
  const groupId = req.params.groupId;
  const newName = req.params.groupName;
  try {
    const group = await Group.findByIdAndUpdate(
      groupId,
      { name: newName },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//Put request to finish all tasks in a group
router.put("/finish_all_tasks/:groupId", async (req, res) => {
  const groupID = req.params.groupId;
  try {
    await Task.updateMany({ groupId: groupID }, { $set: { completed: true } });
    res.status(200).json({ message: "Tasks updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//Put request to unfinish all tasks in a group
router.put("/unfinish_all_tasks/:groupId", async (req, res) => {
  const groupID = req.params.groupId;
  try {
    await Task.updateMany({ groupId: groupID }, { $set: { completed: false } });
    res.status(200).json({ message: "Tasks updated successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//Delete request to delete all tasks in a group
router.delete("/delete_all_tasks/:groupId", async (req, res) => {
  const groupID = req.params.groupId;
  try {
    await Task.deleteMany({ groupId: groupID });
    await AllTasks.deleteMany({ groupId: groupID }); //for All tasks
    res.status(200).json({ message: "Tasks deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// DELETE request to delete a Group
router.delete("/delete_group/:groupId", async (req, res) => {
  const groupID = req.params.groupId;
  try {
    //Delete the tasks associated with the group
    const groupTasks = await Task.deleteMany({ groupId: groupID });

    //Remove from all tasks table too
    const groupAllTasks = await AllTasks.deleteMany({ groupId: groupID })

    //Delete the group
    const group = await Group.findByIdAndRemove(groupID);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }
    res.status(204).send(); // 204 No Content response
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
