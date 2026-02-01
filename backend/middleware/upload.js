const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
const postsDir = path.join(uploadsDir, 'posts');

[uploadsDir, profilesDir, postsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// File filter - only allow images
const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, JPEG, and PNG images are allowed.'), false);
    }
};

// Storage configuration for profile photos
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profilesDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `profile_${req.user.id}_${uuidv4()}${ext}`;
        cb(null, filename);
    }
});

// Storage configuration for post images
const postStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, postsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `post_${req.user.id}_${uuidv4()}${ext}`;
        cb(null, filename);
    }
});

// Multer instances
const uploadProfilePhoto = multer({
    storage: profileStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter
}).single('photo');

const uploadPostImage = multer({
    storage: postStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter
}).single('image');

// Wrapper middleware with error handling
function handleProfileUpload(req, res, next) {
    uploadProfilePhoto(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}

function handlePostUpload(req, res, next) {
    uploadPostImage(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}

module.exports = {
    handleProfileUpload,
    handlePostUpload,
    uploadsDir,
    profilesDir,
    postsDir
};
