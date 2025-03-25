const User = require('../User/User');

const AddAITasks = async (req, res) => {
    const { userID, tasks } = req.body;
    const user = await User.findById(userID);
    user.todos.push(...tasks);
    await user.save();
    res.status(200).json(user);
};

module.exports = AddAITasks;
