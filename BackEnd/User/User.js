const mongoose = require('mongoose');
const dotenv = require('dotenv').config();

mongoose.connect('mongodb://localhost:27017/ToDo')
    .then(() => console.log('mongodb://localhost:27017/ToDo'))
    .catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    todos: {type: Array, default: []},
});

module.exports = mongoose.model('User', UserSchema);