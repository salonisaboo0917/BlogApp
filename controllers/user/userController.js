const db = require('../../config/db');
const {encrypt, match} = require('../../utils/bycrypt');
const sendRes = require('../../utils/response');
const {loginToken, resetToken} = require('../../utils/generateToken');
const jwt = require("jsonwebtoken");
const sendMail = require("../../utils/sendMail");

async function getUserByEmail(email) {
    const [rows] = await db.query("SELECT * FROM tbl_users WHERE email = ?", [email]);
    return rows[0];
}

async function createUser({ first_name, last_name, email, mobile_no, password }) {
    const query = "INSERT INTO tbl_users (role, first_name, last_name, email, mobile_no, password) VALUES ('user', ?, ?, ?, ?, ?)";
    return await db.query(query, [first_name, last_name, email, mobile_no, password]);
}

async function updatePassword(id, password) {
    const query = "UPDATE tbl_users SET password = ? WHERE id = ?";
    return await db.query(query, [password,id]);
}

async function updateUserDB(id, {firstName,lastName,mobileNo}) {
    const query = "UPDATE tbl_users SET first_name = ?, last_name = ?, mobile_no = ? WHERE id = ?";
    return await db.query(query, [firstName,lastName,mobileNo,id]);
}

async function login(req, res) {
    console.log("Login POST request");
    try{
        const {email,password} = req.body;
        const user = await getUserByEmail(email);
        if (!user || user.role !== "user") {
            return sendRes(res,404,false,"User not found");
        }
        const isMatch = await match(password, user.password);
        if (!isMatch) {
            return sendRes(res,400,false,"Invalid email or password");
        }
        if(user.status === 'inactive')
            return sendRes(res,400,false,"You have been set inactive by admin. If you think this is a mistake contact admin.");
        const token = loginToken({ id: user.id, email: user.email, role: user.role, createdAt: user.created_at, updatedAt: user.updated_at });
        return sendRes(res,200,true,"User login successful",token);
    } catch (error) {
        console.log(error);
        return sendRes(res,500,false,"Internal Server Error");
    }
}

async function signUp(req, res) {
    console.log("SignUp POST request");
    try {
        const { first_name, last_name, email, mobile_no, password } = req.body;

        // Check if user already exists by email
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return sendRes(res, 400, false, "User already registered with this email");
        }

        const encryptedPassword = await encrypt(password);

        const user = await createUser({
            first_name,
            last_name,
            email,
            mobile_no,
            password: encryptedPassword
        });

        return sendRes(res, 200, true, "User signUp successful");

    } catch (error) {
        console.log(error);
        return sendRes(res, 500, false, "Internal server error");
    }
};


async function getProfile(req,res) {
    try {
        res.status(200).json({
            statusCode: 200,
            success: true,
            message: "This is a protected user profile route",
            user: req.user  
        });
    } catch (error) {
        console.log(error);
        return sendRes(res,500,false, "Internal Server error");
    }
}

async function changePassword(req,res) {
    const {currPass, newPass, confPass} = req.body;
    const email = req.user.email;
    try {
        const user = await getUserByEmail(email);
        if(!user) {
            return sendRes(res,404,false,"User not found");
        }
        if(newPass !== confPass) {
            return sendRes(res,400,false,"New Password and confirm password are not same");
        }
        const isMatch = await match(currPass, user.password);
        if(!isMatch) {
            return sendRes(res,404,false,"Wrong current password");
        } 
        const encryptedPassword = await encrypt(newPass);
        await updatePassword(user.id,encryptedPassword);
        return sendRes(res,200,true,"Password updated successfully");
    } catch (error) {
        console.log(error);
        return sendRes(res,500,false,"Internal Server error");
    }
}

async function updateUser(req,res) {
    const {first_name,last_name,mobile_no} = req.body;
    const email = req.user.email;
    try {
        const user = await getUserByEmail(email);
        const updatedData = {
            first_name: first_name || user.first_name,
            last_name: last_name || user.last_name,
            mobile_no: mobile_no || user.mobile_no,
        };
        await updateUserDB(user.id, updatedData);
        return sendRes(res,200,true,"User data updated successfully");
    } catch (error) {
        console.log(error);
        return sendRes(res,500,false,"Internal Server Error");
    }
}

async function forgotPass(req, res) {
    const { email } = req.body;
    try {
        console.log(email);
        const user = await getUserByEmail(email);
        console.log(user);
        if (!user) {
            return sendRes(res, 404, false, "User not found");
        }

        const token = resetToken({ id: user.id, email: user.email });
        const resetLink = `${req.protocol}://${req.get('host')}/api/user/reset-password/${token}`;

        const html = `<p>Hi ${user.first_name},</p>
                      <p>Click the link below to reset your password:</p>
                      <a href="${resetLink}">${resetLink}</a>
                      <p>This link is valid for 15 minutes.</p>`;

        await sendMail(email, "Reset Password", html);

        return sendRes(res, 200, true, "Password reset email sent");
    } catch (error) {
        console.error(error);
        return sendRes(res, 500, false, "Internal Server Error");
    }
}

async function resetPass(req, res) {
    const { token } = req.params;
    const { newPass, confPass } = req.body;

    try {
        if (newPass !== confPass) {
            return sendRes(res, 400, false, "Passwords do not match");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await getUserByEmail(decoded.email);
        if (!user) {
            return sendRes(res, 404, false, "User not found");
        }

        const encryptedPassword = await encrypt(newPass);
        await updatePassword(user.id, encryptedPassword);

        return sendRes(res, 200, true, "Password has been reset successfully");
    } catch (error) {
        console.error(error);
        return sendRes(res, 400, false, "Invalid or expired token");
    }
}

module.exports = { login, signUp, getProfile, changePassword, updateUser, forgotPass, resetPass };