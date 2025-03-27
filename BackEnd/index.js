const express = require('express');
const app = express();
const port = 3000;
app.use(express.json());
const cors = require('cors');
app.use(cors());

const Signup = require('./Auth/Signup');
const Signin = require('./Auth/signin');
const AddTask = require('./Tasks/AddTask');
const AddAITasks = require('./Tasks/AddAITasks');
const DeleteTask = require('./Tasks/DeleteTask');
const UpdateTask = require('./Tasks/UpdateTask');
const UpdateTaskFully = require('./Tasks/UpdateTaskFully');

app.get('/', (req, res) => {
    res.send('Hello World!');
  });


  app.put('/signup', Signup);
  app.put('/signin', Signin);
  app.put('/addtask', AddTask);
  app.put('/addaitasks', AddAITasks);
  app.delete('/deletetask', DeleteTask);
  app.put('/updatetask', UpdateTask);
  app.put('/updatetaskfully', UpdateTaskFully);
  
  app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
  });