const { ForumPost, User, Course } = require('../models');
const { Op } = require('sequelize');

// Get all forum posts (public or course-specific)
exports.getPosts = async (req, res) => {
  try {
    const { courseId } = req.query;

    const whereClause = {
      parentId: null,
      recipientId: null
    };

    if (courseId) {
      whereClause.courseId = courseId;
    } else {
      whereClause.courseId = null; // Public forum posts
    }

    const posts = await ForumPost.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve posts', error: error.message });
  }
};

// Create a forum post
exports.createPost = async (req, res) => {
  try {
    const { title, content, courseId } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const post = await ForumPost.create({
      title: title || null,
      content,
      courseId: courseId || null,
      userId,
      parentId: null,
      recipientId: null
    });

    const postWithAuthor = await ForumPost.findByPk(post.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'role']
        }
      ]
    });

    res.status(201).json({ message: 'Post created successfully', post: postWithAuthor });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
};

// Get replies for a post
exports.getReplies = async (req, res) => {
  try {
    const { parentId } = req.params;

    const replies = await ForumPost.findAll({
      where: { parentId },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json(replies);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve replies', error: error.message });
  }
};

// Reply to a post
exports.createReply = async (req, res) => {
  try {
    const { parentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const parentPost = await ForumPost.findByPk(parentId);
    if (!parentPost) {
      return res.status(404).json({ message: 'Parent post not found' });
    }

    const reply = await ForumPost.create({
      content,
      userId,
      parentId,
      courseId: parentPost.courseId,
      recipientId: null
    });

    const replyWithAuthor = await ForumPost.findByPk(reply.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'role']
        }
      ]
    });

    res.status(201).json({ message: 'Reply posted successfully', reply: replyWithAuthor });
  } catch (error) {
    res.status(500).json({ message: 'Failed to post reply', error: error.message });
  }
};

// Get private/direct messages (Q&A)
exports.getDirectMessages = async (req, res) => {
  try {
    const { partnerId } = req.query; // The other user (student/teacher)
    const userId = req.user.id;

    if (!partnerId) {
      return res.status(400).json({ message: 'Partner ID is required' });
    }

    const messages = await ForumPost.findAll({
      where: {
        [Op.or]: [
          { userId: userId, recipientId: partnerId },
          { userId: partnerId, recipientId: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve messages', error: error.message });
  }
};

// Send direct message
exports.sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const userId = req.user.id;

    if (!recipientId || !content) {
      return res.status(400).json({ message: 'Recipient ID and content are required' });
    }

    const message = await ForumPost.create({
      content,
      userId,
      recipientId,
      parentId: null,
      courseId: null
    });

    const messageWithAuthor = await ForumPost.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'role']
        }
      ]
    });

    res.status(201).json({ message: 'Message sent successfully', message: messageWithAuthor });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};
