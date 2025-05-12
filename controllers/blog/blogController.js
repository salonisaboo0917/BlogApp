const db = require('../../config/db');
const sendRes = require('../../utils/response');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/blogsImages');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

async function getBlogBySlugName(slug_name) {
    const [rows] = await db.query(`
        SELECT tbl_blogs.*, tbl_categories.name 
        FROM tbl_blogs 
        JOIN tbl_categories ON tbl_blogs.category_id = tbl_categories.id 
        WHERE tbl_blogs.slug_name = ?
    `, [slug_name]);
    return rows.length > 0 ? rows[0] : null;
}

async function addBlogInDB({ userId, name, slugName, categoryId, description, short_description, imageName }) {
    const query = "INSERT INTO tbl_blogs (user_id, name, slug_name, category_id, description, short_description, image) VALUES (?,?,?,?,?,?,?)";
    return await db.query(query, [userId, name, slugName, categoryId, description, short_description, imageName]);
}

async function updateBlogInDB(id, image, slugName, { name, categoryId, description, short_description }) {
    const query = "UPDATE tbl_blogs SET name = ?, slug_name = ?, category_id = ?, description = ?, short_description = ?, image = ? WHERE id = ?";
    return await db.query(query, [name, slugName, categoryId, description, short_description, image, id]);
}

async function uniqueSlug(name) {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let currSlug = baseSlug;
    let cnt = 1;
    while (true) {
        const isSlugExist = await getBlogBySlugName(currSlug);
        if (!isSlugExist) return currSlug;
        currSlug = `${baseSlug}-${cnt}`;
        cnt++;
    }
}

async function allBlogs(req, res) {
    try {
        const query = `
            SELECT 
                b.id,
                CONCAT(u.first_name, ' ', u.last_name) AS user_name,
                b.name,
                b.slug_name,
                c.name AS category,
                b.description,
                b.short_description,
                b.image,
                b.created_at
            FROM tbl_blogs AS b
            JOIN tbl_users AS u ON b.user_id = u.id
            JOIN tbl_categories AS c ON b.category_id = c.id
            WHERE b.status = 'active';
        `;
        const [blogs] = await db.query(query);
        if (!blogs.length) {
            return sendRes(res, 400, false, "No blogs in DB");
        }
        return res.status(200).json({
            statusCode: 200,
            success: true,
            message: "All blogs in DB:",
            blogs
        });
    } catch (error) {
        console.log(error);
        sendRes(res, 500, false, "Internal Server error");
    }
}

const OnlyOneblog = async (req, res) => {
  try {
    const slugName = req.body.slug_name;

    if (!slugName) {
      return res.status(400).json({ error: "slug_name is required" });
    }

    const blog = await getBlogBySlugName(slugName);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.status(200).json(blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


async function userBlogs(req, res) {
    try {
        const userId = req.user.id;
        const query = `
            SELECT tbl_blogs.*, tbl_categories.name
            FROM tbl_blogs 
            JOIN tbl_categories ON tbl_blogs.category_id = tbl_categories.id 
            WHERE tbl_blogs.user_id = ?
        `;
        const [blogs] = await db.query(query, [userId]);
        if (!blogs.length) {
            return sendRes(res, 400, false, "No blogs in DB");
        }
        return res.status(200).json({
            statusCode: 200,
            success: true,
            message: `All blogs of user ${req.user?.first_name}:`,
            blogs
        });
    } catch (error) {
        console.log(error);
        sendRes(res, 500, false, "Internal Server error");
    }
}

async function categoryBlogs(req, res) {
    try {
        const query = `
            SELECT tbl_blogs.*, tbl_categories.name
            FROM tbl_blogs
            JOIN tbl_categories ON tbl_blogs.category_id = tbl_categories.id
            WHERE tbl_blogs.category_id = ?
        `;
        const [blogs] = await db.query(query, [req.body.id]);
        return res.status(200).json({
            statusCode: 200,
            success: true,
            message: "Blogs by category: ",
            blogs
        });
    } catch (error) {
        console.log(error);
        return sendRes(res, 500, false, "Internal Server Error");
    }
}

async function addBlog(req, res) {
    try {
        const { name, description, short_description, category } = req.body;
        if (!name || !description || !short_description || !category || !req.file) {
            return sendRes(res, 400, false, "All fields including image are required.");
        }
        const userId = req.user.id;
        const slugName = await uniqueSlug(name);
        const imageName = req.file.filename;

        const [[categoryRow]] = await db.query("SELECT id FROM tbl_categories WHERE name = ?", [category]);

        if (!categoryRow) {
            return sendRes(res, 400, false, "Entered category does not exist in the system.");
        }

        await addBlogInDB({
            userId,
            name,
            slugName,
            categoryId: categoryRow.id,
            description,
            short_description,
            imageName
        });

        return sendRes(res, 200, true, "Blog added/uploaded successfully.");
    } catch (error) {
        console.log(error);
        return sendRes(res, 500, false, "Internal Server error");
    }
}

async function updateBlog(req, res) {
    try {
        const userId = req.user.id;
        const slugName = req.body.slugname;
        const blog = await getBlogBySlugName(slugName);
        if (!blog) {
            return sendRes(res, 400, false, "Check the slugname in URL; no Blog found in DB with this slugname.");
        }
        if (blog.user_id !== userId) {
            return sendRes(res, 400, false, "This blog is not yours, so you cannot update it!");
        }

        const [[categoryRow]] = await db.query("SELECT id FROM tbl_categories WHERE name = ?", [req.body.category]);
        if (!categoryRow) {
            return sendRes(res, 400, false, "Entered category does not exist in the system.");
        }

        upload.single('image')(req, res, async (err) => {
            if (err) {
                return sendRes(res, 500, false, "Image not uploaded. Please try again.");
            }

            const { name, description, short_description } = req.body;
            const updatedData = {
                name: name || blog.name,
                categoryId: categoryRow.id || blog.category_id,
                description: description || blog.description,
                short_description: short_description || blog.short_description,
            };

            const newSlug = name ? await uniqueSlug(updatedData.name) : blog.slug_name;
            const imageName = req.file ? req.file.filename : blog.image;

            if (req.file) {
                const filePath = path.join(__dirname, '../../uploads/blogsImages/', blog.image);
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                    else console.log('Old image deleted successfully');
                });
            }

            await updateBlogInDB(blog.id, imageName, newSlug, updatedData);
            return sendRes(res, 200, true, "Blog updated successfully.");
        });
    } catch (error) {
        console.log(error);
        return sendRes(res, 500, false, "Internal Server error");
    }
}

async function deleteBlog(req, res) {
    try {
        const userId = req.user.id;
        const slugName = req.body.slugname;
        const blog = await getBlogBySlugName(slugName);
        if (blog.user_id !== userId)
            return sendRes(res, 400, false, "This blog is not yours so you cannot delete it!!");

        const filePath = path.join(__dirname, '../../uploads/blogsImages/', blog.image);
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

module.exports = {
    allBlogs,
    OnlyOneblog,
    userBlogs,
    categoryBlogs,
    addBlog,
    updateBlog,
    deleteBlog
};
