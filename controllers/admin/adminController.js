const sendRes = require('../../utils/response');
const db = require('../../config/db');
const slugify = require('slugify');


async function getBlogBySlugName(slugName) {
    const [rows] = await db.query(`
        SELECT tbl_blogs.*, tbl_categories.category 
        FROM tbl_blogs 
        JOIN tbl_categories ON tbl_blogs.category_id = tbl_categories.id 
        WHERE tbl_blogs.slug_name = ?;
    `, [slugName]);
    return rows.length > 0 ? rows[0] : null;
}

async function getUsersById(id) {
    const [rows] = await db.query("SELECT * FROM tbl_users WHERE id = ?",[id]);
    return rows.length > 0 ? rows[0] : null;
}



async function getUsers() {
    const [rows] = await db.query("SELECT * FROM tbl_users WHERE role = 'user';");
    return rows;
}

async function getAllUsers(req, res) {
    try {
        const users = await getUsers();
        return res.status(200).json({
            statusCode: 200,
            success: true,
            message: "All users: ",
            users
        })
    } catch (error) {
        console.log(error);
        return sendRes(res,500,false,"Internal Server Error");
    }
}

async function allBlogs(req, res) {
    try {
        const query = `
            SELECT 
                b.*,
                CONCAT(u.first_name, ' ', u.last_name) AS user_name,
                c.name AS category
            FROM tbl_blogs AS b
            JOIN tbl_users AS u ON b.user_id = u.id
            JOIN tbl_categories AS c ON b.category_id = c.id
            WHERE b.deleted_at IS NULL;
        `;
        const [blogs] = await db.query(query);
        if (!blogs.length) {
            return sendRes(res, 400, false, "No blogs in DB");
        }
        return res.status(200).json({
            status: 200,
            success: true,
            message: "All blogs in DB:",
            blogs
        });
    } catch (error) {
        console.log(error);
        sendRes(res, 500, false, "Internal Server error");
    }
}

async function inactiveBlog(req, res) {
    try {
        const slugName = req.params.slugname;
        const blog = await getBlogBySlugName(slugName);
        await db.query("UPDATE tbl_blogs SET status =  'inactive' WHERE id = ?", [blog.id]);
        return sendRes(res, 200, true, "Blog inactivated successfully.");
    } catch (error) {
        console.log(error);
        sendRes(res, 500, false, "Internal Server error");
    }
}

async function activeBlog(req, res) {
    try {
        const slugName = req.params.slugname;
        const blog = await getBlogBySlugName(slugName);
        await db.query("UPDATE tbl_blogs SET status =  'active' WHERE id = ?", [blog.id]);
        return sendRes(res, 200, true, "Blog Activated successfully.");
    } catch (error) {
        console.log(error);
        sendRes(res, 500, false, "Internal Server error");
    }
}

async function allCategory(req,res) {
    try {
        if(req.user.role !== "admin") 
            return sendRes(res,403,false,"Only admins are allowed to see all category");
        const [category] = await db.query("SELECT name from tbl_categories");
        return res.status(200).json({
            statusCode: 200,
            success: true,
            message: "All categories in DB: ",
            category
        });
    } catch (error) {
        console.log(error);
        sendRes(res,500,false,"Internal Server Error");
    }
}

async function createCategory(req, res) {
    try {
        if (req.user.role !== "admin") 
            return sendRes(res, 403, false, "Only admins are allowed to create new category");

        const category = req.body.name;  // Change to 'name' instead of 'category'

        // Validate input
        if (!category || typeof category !== "string" || category.trim() === "") {
            return sendRes(res, 400, false, "Category must be a non-empty string.");
        }

        const slugCat = slugify(category, { lower: true, strict: true });

        await db.query(
            "INSERT INTO tbl_categories (name, slug_name) VALUES (?, ?);",
            [category.trim(), slugCat]
        );

        return sendRes(res, 200, true, "Category added successfully.");
    } catch (error) {
        console.log(error);
        sendRes(res, 500, false, "Internal Server Error");
    }
}


async function updateCategory(req,res) {
    try {
        if(req.user.role !== "admin") 
            return sendRes(res,403,false,"Only admins are allowed to update name");
        const [rows] = await db.query("SELECT name FROM tbl_categories WHERE slug_name = ?", [req.body.slug_name]);
        if (rows.length === 0) {
            return sendRes(res, 404, false, "Category not found.");
        }
        const currCategory = rows[0].category;
        const { newCategory } = req.body;
        const slugName = await slugify(newCategory,{ lower: true, strict: true })
        await db.query("UPDATE tbl_categories SET name = ?, slug_name = ? WHERE slug_name = ?", [newCategory, slugName, currCategory]);
        return sendRes(res, 200, true, "Category updated successfully.");
    } catch (error) {
        console.log(error);
        sendRes(res,500,false,"Internal Server Error");
    }
}

async function deleteCategory(req, res) {
    try {
        if (req.user.role !== "admin") {
            return sendRes(res, 403, false, "Only admins are allowed to delete category");
        }
        const slugName = slugify(req.body.slug_name || "", { lower: true, strict: true });
        console.log("Slug being searched:", slugName);

        const [categories] = await db.query("SELECT id FROM tbl_categories WHERE slug_name = ?", [slugName]);
        if (categories.length === 0) {
            return sendRes(res, 404, false, "Category not found.");
        }
        const categoryId = categories[0].id;
        const [linkedBlogs] = await db.query("SELECT category_id FROM tbl_blogs WHERE category_id = ?", [categoryId]);
        if (linkedBlogs.length > 0) {
            return sendRes(res, 400, false, "Category is used in a blog and can't be deleted.");
        }
        await db.query("DELETE FROM tbl_categories WHERE id = ?", [categoryId]);
        return sendRes(res, 200, true, "Category deleted successfully.");
    } catch (error) {
        console.error(error);
        sendRes(res, 500, false, "Internal Server Error");
    }
}

async function softDeleteBlog(req,res) {
    try {
        const slugName = req.params.slugname;
        await db.query("UPDATE tbl_blogs SET deleted_at = NOW(), status = 'inactive' WHERE slug_name = ?", [slugName]);
        return sendRes(res,200,true,"Blog has been sucessfully soft deleted.");
    } catch (error) {
        console.log(error);
        
        return sendRes(res,500,false,"Internal Server Error");
    }
}

async function deleteBlog(req, res) {
    try {
        const slugName = req.params.slugname;
        const blog = await getBlogBySlugName(slugName);
        const filePath = path.join(__dirname, '../uploads/blogsImages/', blog.image);
        fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting the image:', err);
            else console.log('Image deleted successfully');
        });
        await db.query("DELETE FROM tbl_blogs WHERE id = ?", [blog.id]);
        return sendRes(res, 200, true, "Blog deleted successfully.");
    } catch (error) {
        console.log(error);
        sendRes(res, 500, false, "Internal Server error");
    }
}

async function activeUser(req, res) {
    try {
        const userId = req.body.id;
        const user = await getUsersById(userId);
        if(!user) 
            return sendRes(res,400,false,"No user found with the given id.");
        await db.query("UPDATE tbl_users SET status = 'active' WHERE id = ?", [userId]);
        await db.query("UPDATE tbl_blogs SET status = 'active' WHERE user_id = ?;", [userId]);
        return sendRes(res,200,true,`User ${user.first_name} and all his/her blogs are active now.`);
    } catch (error) {
        console.log(error);
        return sendRes(res, 500, true, "Internal Server error");
    }
}

async function inactiveUser(req, res) {
    try {
        const userId = req.body.id;
        const user = await getUsersById(userId);
        console.log(user);
        if(!user)  {
            console.log(user);
            
            return sendRes(res,400,false,"No user found with the given id.");
        }
        await db.query("UPDATE tbl_users SET status = 'inactive' WHERE id = ?", [userId]);
        await db.query("UPDATE tbl_blogs SET status = 'inactive' WHERE user_id = ?;", [userId]);
        return sendRes(res,200,true,`User ${user.first_name} and all his/her blogs are inactive now.`);
    } catch (error) {
        console.log(error);
        return sendRes(res, 500, true, "Internal Server error");
    }
}
module.exports = {getAllUsers, 
    allBlogs, 
    inactiveBlog,
    activeBlog, 
    allCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    softDeleteBlog, 
    deleteBlog,
    activeUser,
    inactiveUser,
    
};