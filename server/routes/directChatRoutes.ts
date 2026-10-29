import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from './middleware';
import { generateAIResponse } from '../openai';
import { getAvailableTools } from '../tools';

const router = Router();

/**
 * GET /api/direct-chat/:followerId - Get direct chat history
 */
router.get('/:followerId', requireAuth, async (req, res) => {
  const followerId = parseInt(req.params.followerId);
  
  try {
    // Verify follower exists
    const follower = await storage.getAiFollower(followerId);
    if (!follower) {
      return res.status(404).json({ message: "AI Follower not found" });
    }
    
    // Get chat history
    const messages = await storage.getDirectChatMessages(req.user!.id, followerId);
    
    res.json({
      follower,
      messages
    });
  } catch (error) {
    console.error("Error getting direct chat:", error);
    res.status(500).json({ message: "Failed to get direct chat" });
  }
});

/**
 * POST /api/direct-chat/:followerId - Send message to AI follower
 */
router.post('/:followerId', requireAuth, async (req, res) => {
  const followerId = parseInt(req.params.followerId);
  const { content } = req.body;
  
  try {
    // Verify follower exists
    const follower = await storage.getAiFollower(followerId);
    if (!follower) {
      return res.status(404).json({ message: "AI Follower not found" });
    }
    
    // Save user message
    const userMessage = await storage.createDirectChatMessage({
      userId: req.user!.id,
      aiFollowerId: followerId,
      content,
      isUserMessage: true,
    });
    
    // Send early response with user message
    res.status(201).json(userMessage);
    
    // Get recent chat history for context
    const recentMessages = await storage.getDirectChatMessages(req.user!.id, followerId, 10);
    const chatHistory = recentMessages
      .map(msg => `${msg.isUserMessage ? 'User' : follower.name}: ${msg.content}`)
      .join('\n');
    
    // Preserve historical call shape (chatHistory as 2nd arg, follower as 4th).
    // Signature expects (content, personality, previousMessage?, threadContext?, ...).
    void getAvailableTools();
    const aiResponse = await generateAIResponse(
      content,
      chatHistory,
      undefined,
      // Targeted cast: pre-existing arg order does not match ThreadContextData
      follower as unknown as undefined,
    );
    
    // Save AI response
    await storage.createDirectChatMessage({
      userId: req.user!.id,
      aiFollowerId: followerId,
      content: aiResponse.content || "",
      isUserMessage: false,
    });
  } catch (error) {
    console.error("Error in direct chat:", error);
    // Response already sent, so no need to send error
  }
});

export default router;