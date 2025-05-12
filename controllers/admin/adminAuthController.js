const db = require('../../config/db');
const {match} = require('../../utils/bycrypt');
const sendRes = require('../../utils/response');
const {loginToken} = require('../../utils/generateToken');

async function getUserByEmail(email) {
    const [rows] = await db.query("SELECT * FROM tbl_users WHERE email = ?", [email]);
    return rows[0];
}

async function login(req, res) {
    console.log("Login POST request");
    const {email, password} = req.body;
    try{
        const user = await getUserByEmail(email);
        if (!user || user.role !== "admin") {
            return sendRes(res,404,false,"Admin not found");
        }
        const isMatch = await match(password, user.password);
        if (!isMatch) {
            return sendRes(res,400,false,"Invalid email or password");
        }
        const token = loginToken({ id: user.id, email: user.email, role: user.role, createdAt: user.created_at, updatedAt: user.updated_at });
        return sendRes(res,200,true,"Admin Login Successfull",token);
    } catch (error) {
        console.log(error);
        return sendRes(res,500,false,"Internal Server Error");
    }
}

async function getProfile(req, res) {
    try {
        if(req.user.role !== "admin") {
            return sendRes(res, 403, false, "You are not an admin, please visit user route.");
        }
        return res.status(200).json({
            statusCode: 200,
            success: true,
            message: "This is a protected admin profile route",
            user: req.user  
        });
    } catch (error) {
        console.log(error);
        return sendRes(res, 500, false, "Internal Server Error");   
    }
}


module.exports = {login, getProfile};