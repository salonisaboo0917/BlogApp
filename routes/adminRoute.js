const express = require('express');
const {login, getProfile} = require('../controllers/admin//adminAuthController');
const admin = require('../controllers/admin/adminController');
const verifyToken = require('../middlewares/verifyToken');
const validator = require('../middlewares/validate');
const {userSchemaLogin} = require('../validations/userValidation')

const router = express.Router();

router.post('/login', validator(userSchemaLogin), login);
router.get('/profile', verifyToken.admin, getProfile);

router.get('/users/all', verifyToken.admin, admin.getAllUsers);
router.get('/blogs/all', verifyToken.admin, admin.allBlogs);

router.patch('/blog/inactive/:slugname', verifyToken.admin, admin.inactiveBlog);
router.patch('/blog/active/:slugname', admin.activeBlog);
router.delete('/blog/soft-delete/:slugname', verifyToken.admin, admin.softDeleteBlog);
router.delete('/delete/:slugname', verifyToken.admin, admin.deleteBlog);

router.get('/blog/category/all', verifyToken.admin, admin.allCategory);
router.post('/blog/category/create', verifyToken.admin, admin.createCategory);
router.put('/blog/category/update/:slugname', verifyToken.admin, admin.updateCategory);
router.delete('/blog/category/delete/:slugname', verifyToken.admin, admin.deleteCategory);

router.patch('/user/inactive/:id', verifyToken.admin, admin.inactiveUser);
router.patch('/user/active/:id', verifyToken.admin, admin.activeUser);

module.exports = router;