const express = require('express');
const db = require('../database/init');
const { authenticate, authenticateWithProfile } = require('../middleware/auth');
const { handlePostUpload, handleMediaUpload, getMediaType, ALLOWED_VIDEO_TYPES } = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Extract hashtags from content
function extractHashtags(content) {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
}

// GET /api/posts - Get feed (all posts or filtered by hashtag)
router.get('/', authenticate, (req, res) => {
    try {
        const { hashtag, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let posts;

        if (hashtag) {
            // Filter by hashtag
            const searchPattern = `%#${hashtag.toLowerCase()}%`;
            posts = db.prepare(`
        SELECT 
          p.id, p.user_id, p.content, p.image, p.media_type, p.original_post_id, p.created_at,
          u.name as author_name, u.profile_photo as author_photo,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
          (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE LOWER(p.content) LIKE ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `).all(req.user.id, searchPattern, parseInt(limit), offset);
        } else {
            // Get all posts
            posts = db.prepare(`
        SELECT 
          p.id, p.user_id, p.content, p.image, p.media_type, p.original_post_id, p.created_at,
          u.name as author_name, u.profile_photo as author_photo,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
          (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `).all(req.user.id, parseInt(limit), offset);
        }

        // For shared posts, get original post info
        const formattedPosts = posts.map(post => {
            let originalPost = null;
            if (post.original_post_id) {
                originalPost = db.prepare(`
          SELECT p.id, p.content, p.image, p.created_at,
                 u.id as author_id, u.name as author_name, u.profile_photo as author_photo
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE p.id = ?
        `).get(post.original_post_id);
            }

            return {
                id: post.id,
                userId: post.user_id,
                content: post.content,
                image: post.image,
                mediaType: post.media_type || 'image',
                createdAt: post.created_at,
                authorName: post.author_name,
                authorPhoto: post.author_photo,
                likeCount: post.like_count,
                commentCount: post.comment_count,
                shareCount: post.share_count,
                userLiked: post.user_liked > 0,
                hashtags: extractHashtags(post.content),
                isOwnPost: post.user_id === req.user.id,
                originalPost: originalPost ? {
                    id: originalPost.id,
                    content: originalPost.content,
                    image: originalPost.image,
                    mediaType: originalPost.media_type || 'image',
                    createdAt: originalPost.created_at,
                    authorId: originalPost.author_id,
                    authorName: originalPost.author_name,
                    authorPhoto: originalPost.author_photo
                } : null
            };
        });

        res.json(formattedPosts);

    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Failed to get posts' });
    }
});

// POST /api/posts - Create a new post (supports both image and video)
router.post('/', authenticateWithProfile, handleMediaUpload, (req, res) => {
    try {
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Post content is required' });
        }

        // Determine media path and type
        let mediaPath = null;
        let mediaType = null;

        if (req.file) {
            const isVideo = ALLOWED_VIDEO_TYPES.includes(req.file.mimetype);
            if (isVideo) {
                mediaPath = `/uploads/videos/${req.file.filename}`;
                mediaType = 'video';
            } else {
                mediaPath = `/uploads/posts/${req.file.filename}`;
                mediaType = 'image';
            }
        }

        const result = db.prepare(`
      INSERT INTO posts (user_id, content, image, media_type, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(req.user.id, content.trim(), mediaPath, mediaType);

        // Get the created post with author info
        const postId = result.lastInsertRowid;

        if (!postId) {
            return res.status(500).json({ error: 'Failed to create post - no ID returned' });
        }

        const post = db.prepare(`
      SELECT 
        p.id, p.user_id, p.content, p.image, p.media_type, p.created_at,
        u.name as author_name, u.profile_photo as author_photo
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(postId);

        if (!post) {
            return res.status(500).json({ error: 'Failed to retrieve created post' });
        }

        res.status(201).json({
            id: post.id,
            userId: post.user_id,
            content: post.content,
            image: post.image,
            mediaType: post.media_type || 'image',
            createdAt: post.created_at,
            authorName: post.author_name,
            authorPhoto: post.author_photo,
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            userLiked: false,
            hashtags: extractHashtags(post.content),
            isOwnPost: true
        });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// GET /api/posts/:id - Get single post with comments
router.get('/:id', authenticate, (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        const post = db.prepare(`
      SELECT 
        p.id, p.user_id, p.content, p.image, p.original_post_id, p.created_at,
        u.name as author_name, u.profile_photo as author_photo,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(req.user.id, postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Get comments
        const comments = db.prepare(`
      SELECT 
        c.id, c.content, c.created_at, c.user_id,
        u.name as author_name, u.profile_photo as author_photo
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);

        // Get original post if this is a share
        let originalPost = null;
        if (post.original_post_id) {
            originalPost = db.prepare(`
        SELECT p.id, p.content, p.image, p.created_at,
               u.id as author_id, u.name as author_name, u.profile_photo as author_photo
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(post.original_post_id);
        }

        res.json({
            id: post.id,
            userId: post.user_id,
            content: post.content,
            image: post.image,
            createdAt: post.created_at,
            authorName: post.author_name,
            authorPhoto: post.author_photo,
            likeCount: post.like_count,
            commentCount: post.comment_count,
            shareCount: post.share_count,
            userLiked: post.user_liked > 0,
            hashtags: extractHashtags(post.content),
            isOwnPost: post.user_id === req.user.id,
            comments: comments.map(c => ({
                id: c.id,
                content: c.content,
                createdAt: c.created_at,
                userId: c.user_id,
                authorName: c.author_name,
                authorPhoto: c.author_photo,
                isOwnComment: c.user_id === req.user.id
            })),
            originalPost: originalPost ? {
                id: originalPost.id,
                content: originalPost.content,
                image: originalPost.image,
                createdAt: originalPost.created_at,
                authorId: originalPost.author_id,
                authorName: originalPost.author_name,
                authorPhoto: originalPost.author_photo
            } : null
        });

    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: 'Failed to get post' });
    }
});

// DELETE /api/posts/:id - Delete own post
router.delete('/:id', authenticateWithProfile, (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        // Check if post exists and belongs to user
        const post = db.prepare('SELECT id, user_id, image FROM posts WHERE id = ?').get(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only delete your own posts' });
        }

        // Delete post (cascades to likes, comments, etc.)
        db.prepare('DELETE FROM posts WHERE id = ?').run(postId);

        // Delete image file if exists
        if (post.image) {
            const imagePath = path.join(__dirname, '..', post.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.json({ message: 'Post deleted successfully' });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// POST /api/posts/:id/like - Like a post
router.post('/:id/like', authenticateWithProfile, (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        // Check if post exists
        const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if already liked
        const existingLike = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(postId, req.user.id);
        if (existingLike) {
            return res.status(400).json({ error: 'You have already liked this post' });
        }

        // Add like
        db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, req.user.id);

        // Get updated like count
        const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId).count;

        res.json({ message: 'Post liked', likeCount, userLiked: true });

    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// DELETE /api/posts/:id/like - Unlike a post
router.delete('/:id/like', authenticateWithProfile, (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        // Check if like exists
        const like = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(postId, req.user.id);
        if (!like) {
            return res.status(400).json({ error: 'You have not liked this post' });
        }

        // Remove like
        db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, req.user.id);

        // Get updated like count
        const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId).count;

        res.json({ message: 'Like removed', likeCount, userLiked: false });

    } catch (error) {
        console.error('Unlike post error:', error);
        res.status(500).json({ error: 'Failed to unlike post' });
    }
});

// POST /api/posts/:id/comments - Add comment to post
router.post('/:id/comments', authenticateWithProfile, (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const { content } = req.body;

        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Comment content is required' });
        }

        // Check if post exists
        const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Add comment
        const result = db.prepare(`
      INSERT INTO comments (post_id, user_id, content, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(postId, req.user.id, content.trim());

        // Get the created comment with author info
        const comment = db.prepare(`
      SELECT c.id, c.content, c.created_at, c.user_id,
             u.name as author_name, u.profile_photo as author_photo
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

        // Get updated comment count
        const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(postId).count;

        res.status(201).json({
            comment: {
                id: comment.id,
                content: comment.content,
                createdAt: comment.created_at,
                userId: comment.user_id,
                authorName: comment.author_name,
                authorPhoto: comment.author_photo,
                isOwnComment: true
            },
            commentCount
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// POST /api/posts/:id/share - Share/repost a post
router.post('/:id/share', authenticateWithProfile, (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const { content } = req.body;

        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        // Check if original post exists
        const originalPost = db.prepare('SELECT id, user_id, original_post_id FROM posts WHERE id = ?').get(postId);
        if (!originalPost) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // If the post is already a share, get the original post
        const rootPostId = originalPost.original_post_id || originalPost.id;

        // Create share record
        db.prepare(`
      INSERT INTO shares (post_id, user_id, created_at)
      VALUES (?, ?, datetime('now'))
    `).run(rootPostId, req.user.id);

        // Create new post as a share
        const shareContent = content ? content.trim() : '';
        const result = db.prepare(`
      INSERT INTO posts (user_id, content, original_post_id, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(req.user.id, shareContent, rootPostId);

        // Get the created share post with author info
        const sharePost = db.prepare(`
      SELECT 
        p.id, p.user_id, p.content, p.original_post_id, p.created_at,
        u.name as author_name, u.profile_photo as author_photo
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

        // Get original post details
        const originalPostDetails = db.prepare(`
      SELECT p.id, p.content, p.image, p.created_at,
             u.id as author_id, u.name as author_name, u.profile_photo as author_photo
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(rootPostId);

        // Get updated share count
        const shareCount = db.prepare('SELECT COUNT(*) as count FROM shares WHERE post_id = ?').get(rootPostId).count;

        res.status(201).json({
            id: sharePost.id,
            userId: sharePost.user_id,
            content: sharePost.content,
            createdAt: sharePost.created_at,
            authorName: sharePost.author_name,
            authorPhoto: sharePost.author_photo,
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            userLiked: false,
            isOwnPost: true,
            originalPost: {
                id: originalPostDetails.id,
                content: originalPostDetails.content,
                image: originalPostDetails.image,
                createdAt: originalPostDetails.created_at,
                authorId: originalPostDetails.author_id,
                authorName: originalPostDetails.author_name,
                authorPhoto: originalPostDetails.author_photo
            },
            originalShareCount: shareCount
        });

    } catch (error) {
        console.error('Share post error:', error);
        res.status(500).json({ error: 'Failed to share post' });
    }
});

// GET /api/posts/user/:userId - Get posts by a specific user
router.get('/user/:userId', authenticate, (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const posts = db.prepare(`
      SELECT 
        p.id, p.user_id, p.content, p.image, p.original_post_id, p.created_at,
        u.name as author_name, u.profile_photo as author_photo,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, userId, parseInt(limit), offset);

        const formattedPosts = posts.map(post => {
            let originalPost = null;
            if (post.original_post_id) {
                originalPost = db.prepare(`
          SELECT p.id, p.content, p.image, p.created_at,
                 u.id as author_id, u.name as author_name, u.profile_photo as author_photo
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE p.id = ?
        `).get(post.original_post_id);
            }

            return {
                id: post.id,
                userId: post.user_id,
                content: post.content,
                image: post.image,
                createdAt: post.created_at,
                authorName: post.author_name,
                authorPhoto: post.author_photo,
                likeCount: post.like_count,
                commentCount: post.comment_count,
                shareCount: post.share_count,
                userLiked: post.user_liked > 0,
                hashtags: extractHashtags(post.content),
                isOwnPost: post.user_id === req.user.id,
                originalPost: originalPost ? {
                    id: originalPost.id,
                    content: originalPost.content,
                    image: originalPost.image,
                    createdAt: originalPost.created_at,
                    authorId: originalPost.author_id,
                    authorName: originalPost.author_name,
                    authorPhoto: originalPost.author_photo
                } : null
            };
        });

        res.json(formattedPosts);

    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({ error: 'Failed to get posts' });
    }
});

module.exports = router;
