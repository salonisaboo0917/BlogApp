const multer = require('multer');
const path = require('path');
const sendRes = require('../utils/response');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/blogsImages');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

function uploadImage(req, res, next) {
    const uploader = upload.single('image');
    uploader(req, res, function (err) {
        if (err) {
            console.error(err);
            return sendRes(res, 500, false, "Image not uploaded");
        }
        next();
    });
}

module.exports = uploadImage;