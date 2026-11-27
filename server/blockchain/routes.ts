import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { generateMetadata, mintAIFollowerNFT, getAIFollowerMintingStatus } from './nft-service';
import { requireAuth } from '../routes/middleware';
import { isNftMintEnabled, requireNftMintEnabled, mintRateLimit } from './mint-gate';
import type { AiFollower } from '@shared/schema';

const router = Router();

/**
 * GET /api/nft/enabled
 * Reports whether the NFT feature is on, so the client can hide its UI. Booleans only.
 */
router.get('/enabled', requireAuth, (_req: Request, res: Response) => {
  res.json({ enabled: isNftMintEnabled() });
});

// Every route below is off (404) unless the feature flag and signing key are set,
// and requires a signed-in user.
router.use(requireNftMintEnabled, requireAuth);

/**
 * Load the follower named by :followerId and confirm the signed-in user owns it.
 * Sends 400/404/403 and returns undefined when the request should stop.
 */
async function loadOwnedFollower(req: Request, res: Response): Promise<AiFollower | undefined> {
  const followerId = parseInt(req.params.followerId);
  if (isNaN(followerId)) {
    res.status(400).json({ error: 'Invalid follower ID' });
    return undefined;
  }

  const follower = await storage.getAiFollower(followerId);
  if (!follower) {
    res.status(404).json({ error: 'AI Follower not found' });
    return undefined;
  }

  if (follower.userId == null || follower.userId !== req.user?.id) {
    res.status(403).json({ error: 'You do not own this AI follower' });
    return undefined;
  }

  return follower;
}

/**
 * GET /api/nft/metadata/:followerId
 * Returns the metadata for an AI follower
 */
router.get('/metadata/:followerId', async (req: Request, res: Response) => {
  try {
    const follower = await loadOwnedFollower(req, res);
    if (!follower) return;
    
    // Generate metadata
    const { metadata } = generateMetadata(follower);
    
    res.json(metadata);
  } catch (error) {
    console.error('Error retrieving metadata:', error);
    res.status(500).json({ error: 'Failed to retrieve NFT metadata' });
  }
});

/**
 * GET /api/nft/status/:followerId
 * Returns the minting status for an AI follower
 */
router.get('/status/:followerId', async (req: Request, res: Response) => {
  try {
    const follower = await loadOwnedFollower(req, res);
    if (!follower) return;
    
    // Get minting status
    const status = await getAIFollowerMintingStatus(follower.id);
    
    res.json(status);
  } catch (error) {
    console.error('Error checking NFT status:', error);
    res.status(500).json({ error: 'Failed to check NFT status' });
  }
});

/**
 * POST /api/nft/mint/:followerId
 * Mints an AI follower as an NFT
 */
router.post('/mint/:followerId', mintRateLimit, async (req: Request, res: Response) => {
  try {
    // The signed-in user must own this AI follower
    const follower = await loadOwnedFollower(req, res);
    if (!follower) return;
    
    // Validate input
    const { ownerAddress } = req.body;
    if (!ownerAddress || typeof ownerAddress !== 'string') {
      return res.status(400).json({ error: 'Owner address is required' });
    }
    
    // Check if the address is valid
    if (!ownerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }
    
    // Check current minting status
    const currentStatus = await getAIFollowerMintingStatus(follower.id);
    if (currentStatus.status === 'MINTED') {
      return res.json(currentStatus);
    }
    
    // Mint the NFT
    const mintingResult = await mintAIFollowerNFT(follower, ownerAddress);
    
    res.json(mintingResult);
  } catch (error) {
    console.error('Error minting NFT:', error);
    res.status(500).json({ error: 'Failed to mint NFT' });
  }
});

// Export the router
export default router;