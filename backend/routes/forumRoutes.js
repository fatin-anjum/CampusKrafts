const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { protect } = require('../middleware/auth');

router.get('/', protect, forumController.getPosts);
router.post('/', protect, forumController.createPost);
router.get('/:parentId/replies', protect, forumController.getReplies);
router.post('/:parentId/replies', protect, forumController.createReply);
router.get('/direct', protect, forumController.getDirectMessages);
router.post('/direct', protect, forumController.sendDirectMessage);

module.exports = router;
