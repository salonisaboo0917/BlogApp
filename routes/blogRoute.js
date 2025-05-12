const express = require('express');
const  blogs = require('../controllers/blog/blogController.js');
const verifyToken = require('../middlewares/verifyToken.js');
const uploadImage = require('../middlewares/uploadImage.js');
const validator = require('../middlewares/validate.js');
const blogSchema = require('../validations/blogValidation.js');

const router = express.Router();

router.get('/all', blogs.allBlogs);
router.get('/name/:slugname', blogs.OnlyOneblog);
router.get('/userblogs', verifyToken.user, blogs.userBlogs)
router.post('/create', verifyToken.user, uploadImage,validator(blogSchema), blogs.addBlog);
router.put('/update/:slugname', verifyToken.user, blogs.updateBlog);
router.delete('/delete/:slugname', verifyToken.user, blogs.deleteBlog);
router.get('/category/id/:id', blogs.categoryBlogs)

module.exports = router;