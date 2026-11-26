import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from './middleware';
import { generateAIResponse } from '../openai';
import { processTextWithTools } from '../tools';

const router = Router();

/**
 * GET /api/direct-chat/:followerId - Get direct chat history
 */
router.get('/:followerId', requireAuth, async (req, res) => {
  const followerId = parseInt(req.params.followerId);
  
  try {
    // Verify the follower exists and is owned by the user
    const follower = await storage.getAiFollower(followerId);
    if (!follower || follower.userId !== req.user!.id) {
      return res.status(404).json({ message: "AI Follower not found or you don't have permission" });
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
    // Verify the follower exists and is owned by the user
    const follower = await storage.getAiFollower(followerId);
    if (!follower || follower.userId !== req.user!.id) {
      return res.status(404).json({ message: "AI Follower not found or you don't have permission" });
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
    
    const aiResponse = await generateAIResponse(
      content,
      follower.personality,
      undefined,
      undefined,
      chatHistory,
      follower,
    );
    
    // Process tool markup (e.g. [calc: ...]) the same way the response scheduler does
    let replyContent = aiResponse.content || "";
    let toolsUsed: ReturnType<typeof processTextWithTools>["toolsUsed"] | null = null;
    if (replyContent && follower.tools?.equipped?.length) {
      try {
        const processResult = processTextWithTools(replyContent, follower);
        replyContent = processResult.processedText;
        toolsUsed = processResult.toolsUsed;
      } catch (toolError) {
        console.error("Error processing direct chat tools:", toolError);
      }
    }

    // Save AI response
    await storage.createDirectChatMessage({
      userId: req.user!.id,
      aiFollowerId: followerId,
      content: replyContent,
      isUserMessage: false,
      toolsUsed,
    });
  } catch (error) {
    console.error("Error in direct chat:", error);
    // Response already sent, so no need to send error
  }
});

export default router;