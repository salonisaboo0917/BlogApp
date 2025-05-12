const express = require('express');
const {login, signUp, getProfile, changePassword, updateUser, forgotPass, resetPass} = require('../controllers/user/userController');
const verifyToken = require('../middlewares/verifyToken');
const validator = require('../middlewares/validate');
const {userSchemaLogin, userSchemaSignUp, changePasswordSchema} = require('../validations/userValidation');

const router = express.Router();

router.post('/login', validator(userSchemaLogin), login);
router.post('/signup', validator(userSchemaSignUp), signUp);
router.get('/profile', verifyToken.user, getProfile);
router.patch('/change-password', validator(changePasswordSchema), verifyToken.user, changePassword);
router.patch('/update-profile', verifyToken.user, updateUser);
router.post('/forgot-password', forgotPass);
router.post("/reset-password/:token", resetPass);

module.exports = router;