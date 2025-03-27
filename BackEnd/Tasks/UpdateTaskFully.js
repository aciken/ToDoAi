const User = require('../User/User');

const UpdateTaskFully = async (req, res) => {
    try {
        const { taskId, task, userID } = req.body;

        // First find the user to get all tasks
        const user = await User.findById(userID);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Convert task times to minutes for easier comparison
        const taskStartMinutes = convertTimeToMinutes(task.startTime);
        const taskEndMinutes = taskStartMinutes + task.duration;

        // Check for overlaps with other tasks (excluding the current task)
        const hasOverlap = user.tasks.some(existingTask => {
            // Skip the current task
            if (existingTask.id === taskId) return false;
            
            // Skip tasks on different dates
            if (existingTask.date !== task.date) return false;
            
            const existingStartMinutes = convertTimeToMinutes(existingTask.startTime);
            const existingEndMinutes = existingStartMinutes + existingTask.duration;

            // Check if the new task overlaps with existing task
            return (taskStartMinutes < existingEndMinutes && taskEndMinutes > existingStartMinutes);
        });

        if (hasOverlap) {
            return res.status(400).json({ 
                message: 'Cannot update task: The new time overlaps with another task on the same day',
                error: 'TASK_OVERLAP'
            });
        }

        // If no overlap, proceed with the update
        const updatedUser = await User.findOneAndUpdate(
            { _id: userID, 'tasks.id': taskId },
            { $set: { 'tasks.$': task } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Error updating task', error: error.message });
    }
};

// Helper function to convert time string (HH:mm) to minutes
const convertTimeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours * 60) + minutes;
};

module.exports = UpdateTaskFully;
