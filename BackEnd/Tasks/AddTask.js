const User = require('../User/User');

const AddTask = async (req, res) => {
    const { newTask, userID } = req.body;
    console.log(newTask, userID);
    const user = await User.findById(userID);
    user.tasks.push(newTask);
    await user.save();
    res.status(200).json(user);
};

module.exports = AddTask;
