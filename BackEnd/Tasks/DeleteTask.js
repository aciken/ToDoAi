const User = require('../User/User');

const DeleteTask = async (req, res) => {
    const { taskId, userID } = req.body;
    const user = await User.findById(userID);
    user.tasks = user.tasks.filter(task => task.id !== taskId);
    await user.save();
    res.status(200).json(user);
};

module.exports = DeleteTask;
