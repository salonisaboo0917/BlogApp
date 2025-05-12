const express = require('express');
const cors = require('cors');

const adminRouters = require('./routes/adminRoute');
const userRouters = require('./routes/userRoute');
const blogsRouters = require('./routes/blogRoute');


const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("server is working!");
})


app.use('/api/user', userRouters);
app.use('/api/admin', adminRouters);
app.use('/blog', blogsRouters);


app.listen(5000, () => console.log("Server started"));