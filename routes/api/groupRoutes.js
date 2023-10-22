//Group Attributes
//Group ID : String
//Group Name : String
//Group Members : UserID[]
var express = require("express");
var router = express.Router();
var Group = require("../../models/groupModel");
const User = require("../../models/userModel");
var Task = require("../../models/taskModel");

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
      return res.status(404).json({ message: "User is not owner" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//Post Request By Creating Group
router.post("/create_group", async (req, res) => {
  try {
    const { name, usernameList } = req.body;

    //validate input
    if (!name) {
      return res.status(400).json({ error: "Group name is required" });
    }
    //Turns all the member strings into ObjectIds
    members = [];
    for (const username of usernameList) {
      const user = await User.findOne({ username });
      members.push(user._id);
    }
    const owner = members[0];
    //save group
    const group = new Group({ name, members, owner });
    await group.save();

    res.status(201).json({ message: "Group created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// PUT request to add/delete a UserID to/from a Group
router.put("/groups/:groupId/users/:userId", async (req, res) => {
  const groupID = req.params.groupId;
  const userID = req.params.userId;
  // console.log(groupID)
  
  try {
    const { action } = req.body;
    console.log(action) // will say 'addUser' or 'deleteUser'
    const group = await Group.findById(groupID);
    console.log(userID);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }
    const user = await User.findOne( {username: userID} );
    //group.members.push(user._id);
    
    // Add or delete the UserID from the Group's members array
    if (action == "addUser") {
      group.members.push(user._id);
    } else if (action == "deleteUser") {
      group.members.pull(user._id);
    }

    const updatedGroup = await group.save();

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET request for displaying the members in the group
router.get("/list_group_members/:groupId", async (req, res) => {
  const groupID = req.params.groupId;

  try {
    const group = await Group.findById(groupID);

    // Get an array of User ObjectIDs from the group's members
    const memberObjectIDs = group.members;

    // Fetch the usernames for the User ObjectIDs
    const membersWithUsernames = await User.find({ _id: { $in: memberObjectIDs } });

    // Extract usernames from the user documents
    const usernames = membersWithUsernames.map(user => user.username);

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

// DELETE request to delete a Group
router.delete("/delete_group/:groupId", async (req, res) => {
  const groupID = req.params.groupId;
  try {
    //Delete the tasks associated with the group
    const groupTasks = await Task.deleteMany({ groupId: groupID });

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