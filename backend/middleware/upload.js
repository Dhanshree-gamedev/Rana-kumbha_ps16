const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
const postsDir = path.join(uploadsDir, 'posts');
const videosDir = path.join(uploadsDir, 'videos');

[uploadsDir, profilesDir, postsDir, videosDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// File size limits
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

// File filter - only allow images
const imageFilter = (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, JPEG, and PNG images are allowed.'), false);
    }
};

// File filter - allow images and videos
const mediaFilter = (req, file, cb) => {
    if (ALLOWED_MEDIA_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, MP4, and WEBM files are allowed.'), false);
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

// Storage configuration for post media (images and videos)
const postMediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Store videos in videos folder, images in posts folder
        if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
            cb(null, videosDir);
        } else {
            cb(null, postsDir);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const prefix = ALLOWED_VIDEO_TYPES.includes(file.mimetype) ? 'video' : 'post';
        const filename = `${prefix}_${req.user.id}_${uuidv4()}${ext}`;
        cb(null, filename);
    }
});

// Multer instances
const uploadProfilePhoto = multer({
    storage: profileStorage,
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: imageFilter
}).single('photo');

const uploadPostMedia = multer({
    storage: postMediaStorage,
    limits: { fileSize: MAX_VIDEO_SIZE },
    fileFilter: mediaFilter
}).single('media');

// Legacy - for backward compatibility
const uploadPostImage = multer({
    storage: postMediaStorage,
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: imageFilter
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

function handleMediaUpload(req, res, next) {
    uploadPostMedia(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size for videos is 50MB.' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        // Detect media type and add to request
        if (req.file) {
            req.mediaType = ALLOWED_VIDEO_TYPES.includes(req.file.mimetype) ? 'video' : 'image';
        }

        next();
    });
}

// Helper to determine media type from mimetype
function getMediaType(mimetype) {
    if (ALLOWED_VIDEO_TYPES.includes(mimetype)) return 'video';
    if (ALLOWED_IMAGE_TYPES.includes(mimetype)) return 'image';
    return null;
}

module.exports = {
    handleProfileUpload,
    handlePostUpload,
    handleMediaUpload,
    getMediaType,
    uploadsDir,
    profilesDir,
    postsDir,
    videosDir,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES
};
