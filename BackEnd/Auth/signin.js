const User = require('../User/User');

const Signin = async (req, res) => {
    const { email, password } = req.body;
    console.log(email, password);
    const user = await User.findOne({ email, password });
    console.log(user);
    if(user) {
        res.status(200).json(user);
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

module.exports = Signin;
