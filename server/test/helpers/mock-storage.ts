/**
 * Mock storage class for testing
 * In-memory implementation of IStorage for unit/integration tests
 */

import { IStorage } from '../../storage';
import {
  User,
  InsertUser,
  Post,
  AiFollower,
  AiInteraction,
  PendingResponse,
  Circle,
  InsertCircle,
  CircleMember,
  InsertCircleMember,
  CircleFollower,
  CircleCollective,
  CircleInvitation,
  InsertCircleInvitation,
  Notification,
  InsertNotification,
  DirectChat,
  InsertDirectChat,
  AiFollowerCollective,
  InsertAiFollowerCollective,
  AiFollowerCollectiveMember,
  Lab,
  InsertLab,
  LabCircle,
  LabContent,
  InsertLabContent,
  LabAnalysisResult,
} from '@shared/schema';
import { createTestUser, createTestFollower, createTestPost, createTestCircle } from './test-factories';

function dateTime(value: Date | null | undefined): number {
  return value instanceof Date ? value.getTime() : 0;
}

/**
 * Mock storage for tests. Arrays are public so tests can seed/reset state.
 */
export class MockStorage implements IStorage {
  users: User[] = [];
  posts: Post[] = [];
  followers: AiFollower[] = [];
  interactions: AiInteraction[] = [];
  pendingResponses: PendingResponse[] = [];
  circles: Circle[] = [];
  circleMembers: CircleMember[] = [];
  circleFollowers: CircleFollower[] = [];
  circleCollectives: CircleCollective[] = [];
  circleInvitations: CircleInvitation[] = [];
  labs: Lab[] = [];
  labCircles: LabCircle[] = [];
  labContents: LabContent[] = [];
  labAnalysisResults: LabAnalysisResult[] = [];
  /** Alias used by older test helpers */
  collectives: AiFollowerCollective[] = [];
  collectiveMembers: AiFollowerCollectiveMember[] = [];
  notifications: Notification[] = [];
  directMessages: DirectChat[] = [];
  followerResponses: PendingResponse[] = [];

  /** Back-compat alias for resetAppState / older tests */
  get followerCollectives(): AiFollowerCollective[] {
    return this.collectives;
  }
  set followerCollectives(value: AiFollowerCollective[]) {
    this.collectives = value;
  }

  constructor() {
    this.seedDefaults();
  }

  /** Reset to empty, then re-seed default fixtures */
  reset(): void {
    this.users = [];
    this.posts = [];
    this.followers = [];
    this.interactions = [];
    this.pendingResponses = [];
    this.circles = [];
    this.circleMembers = [];
    this.circleFollowers = [];
    this.circleCollectives = [];
    this.circleInvitations = [];
    this.labs = [];
    this.labCircles = [];
    this.labContents = [];
    this.labAnalysisResults = [];
    this.collectives = [];
    this.collectiveMembers = [];
    this.notifications = [];
    this.directMessages = [];
    this.followerResponses = [];
  }

  /** Clear all collections (used between tests) */
  clear(): void {
    this.reset();
  }

  private seedDefaults(): void {
    this.users.push(createTestUser({ id: 1, username: 'testuser' }));
    this.posts.push(createTestPost({ id: 1, userId: 1 }));
    this.followers.push(createTestFollower({ id: 1, userId: 1 }));
    this.circles.push(createTestCircle({ id: 1, userId: 1 }));
  }

  private nextId(items: { id: number }[]): number {
    return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  // Convenience alias used by test setup helpers
  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.nextId(this.users),
      avatarUrl: null,
      bio: null,
      createdAt: new Date(),
      ...user,
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<Pick<User, 'avatarUrl' | 'bio'>>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error(`User ${id} not found`);
    Object.assign(user, updates);
    return user;
  }

  async createPost(userId: number, content: string): Promise<Post> {
    const newPost: Post = {
      id: this.nextId(this.posts),
      userId,
      content,
      createdAt: new Date(),
      circleId: null,
      labId: null,
      labExperiment: null,
      targetRole: null,
    };
    this.posts.push(newPost);
    return newPost;
  }

  async getPost(id: number): Promise<Post | undefined> {
    return this.posts.find((post) => post.id === id);
  }

  async getUserPosts(userId: number): Promise<Post[]> {
    return this.posts
      .filter((post) => post.userId === userId)
      .sort((a, b) => dateTime(b.createdAt) - dateTime(a.createdAt));
  }

  async getAiFollowers(userId: number): Promise<(AiFollower & { parentName?: string })[]> {
    return this.followers.filter((follower) => follower.userId === userId);
  }

  async getAiFollower(id: number): Promise<AiFollower | undefined> {
    return this.followers.find((follower) => follower.id === id);
  }

  async createAiFollower(
    userId: number,
    follower: Omit<AiFollower, 'id' | 'userId'>
  ): Promise<AiFollower> {
    const newFollower: AiFollower = {
      id: this.nextId(this.followers),
      userId,
      ...follower,
    };
    this.followers.push(newFollower);
    return newFollower;
  }

  async createAiInteraction(
    interaction: Omit<AiInteraction, 'id' | 'createdAt'>
  ): Promise<AiInteraction> {
    const newInteraction: AiInteraction = {
      id: this.nextId(this.interactions),
      createdAt: new Date(),
      ...interaction,
    };
    this.interactions.push(newInteraction);
    return newInteraction;
  }

  async getInteraction(id: number): Promise<AiInteraction | undefined> {
    return this.interactions.find((interaction) => interaction.id === id);
  }

  async getPostInteractions(postId: number): Promise<AiInteraction[]> {
    return this.interactions.filter((interaction) => interaction.postId === postId);
  }

  async createPendingResponse(
    response: Omit<PendingResponse, 'id' | 'createdAt'>
  ): Promise<PendingResponse> {
    const newResponse: PendingResponse = {
      id: this.nextId(this.pendingResponses),
      createdAt: new Date(),
      ...response,
    };
    this.pendingResponses.push(newResponse);
    this.followerResponses.push(newResponse);
    return newResponse;
  }

  async getPendingResponses(): Promise<PendingResponse[]> {
    return this.pendingResponses.filter((response) => !response.processed);
  }

  async markPendingResponseProcessed(id: number): Promise<void> {
    const response = this.pendingResponses.find((item) => item.id === id);
    if (response) response.processed = true;
  }

  async updateAiFollower(
    id: number,
    updates: Partial<
      Pick<
        AiFollower,
        'name' | 'personality' | 'responsiveness' | 'background' | 'communicationStyle' | 'tools'
      >
    >
  ): Promise<AiFollower> {
    const follower = await this.getAiFollower(id);
    if (!follower) throw new Error(`AI follower ${id} not found`);
    Object.assign(follower, updates);
    return follower;
  }

  async updateFollowerInterests(id: number, interests: string[]): Promise<void> {
    const follower = await this.getAiFollower(id);
    if (follower) follower.interests = interests;
  }

  async updateFollowerInteractionPreferences(
    id: number,
    likes: string[],
    dislikes: string[]
  ): Promise<void> {
    const follower = await this.getAiFollower(id);
    if (follower) follower.interactionPreferences = { likes, dislikes };
  }

  async deleteAiFollower(id: number): Promise<void> {
    this.followers = this.followers.filter((follower) => follower.id !== id);
  }

  async deactivateAiFollower(id: number): Promise<AiFollower> {
    const follower = await this.getAiFollower(id);
    if (!follower) throw new Error(`AI follower ${id} not found`);
    follower.active = false;
    return follower;
  }

  async reactivateAiFollower(id: number): Promise<AiFollower> {
    const follower = await this.getAiFollower(id);
    if (!follower) throw new Error(`AI follower ${id} not found`);
    follower.active = true;
    return follower;
  }

  async getPostPendingResponses(postId: number): Promise<PendingResponse[]> {
    return this.pendingResponses.filter((response) => response.postId === postId);
  }

  async getLabPendingResponses(labId: number): Promise<{
    total: number;
    pending: number;
    completed: number;
    completionPercentage: number;
    pendingResponses: (PendingResponse & { aiFollower: AiFollower; post: Post })[];
  }> {
    const labPosts = this.posts.filter((post) => post.labId === labId);
    const labPostIds = new Set(labPosts.map((post) => post.id));
    const related = this.pendingResponses.filter(
      (response) => response.postId != null && labPostIds.has(response.postId)
    );
    const enriched = related.flatMap((response) => {
      const aiFollower = this.followers.find((f) => f.id === response.aiFollowerId);
      const post = this.posts.find((p) => p.id === response.postId);
      if (!aiFollower || !post) return [];
      return [{ ...response, aiFollower, post }];
    });
    const pending = enriched.filter((r) => !r.processed).length;
    const completed = enriched.length - pending;
    return {
      total: enriched.length,
      pending,
      completed,
      completionPercentage: enriched.length ? (completed / enriched.length) * 100 : 0,
      pendingResponses: enriched,
    };
  }

  async createAiFollowerCollective(
    userId: number,
    collective: InsertAiFollowerCollective
  ): Promise<AiFollowerCollective> {
    const newCollective: AiFollowerCollective = {
      id: this.nextId(this.collectives),
      userId,
      name: collective.name,
      description: collective.description ?? null,
      personality: collective.personality,
      createdAt: new Date(),
      active: true,
    };
    this.collectives.push(newCollective);
    return newCollective;
  }

  async getAiFollowerCollective(id: number): Promise<AiFollowerCollective | undefined> {
    return this.collectives.find((collective) => collective.id === id);
  }

  async getUserAiFollowerCollectives(userId: number): Promise<AiFollowerCollective[]> {
    return this.collectives.filter((collective) => collective.userId === userId);
  }

  async addFollowerToCollective(
    collectiveId: number,
    aiFollowerId: number
  ): Promise<AiFollowerCollectiveMember> {
    const member: AiFollowerCollectiveMember = {
      id: this.nextId(this.collectiveMembers),
      collectiveId,
      aiFollowerId,
      addedAt: new Date(),
    };
    this.collectiveMembers.push(member);
    return member;
  }

  async getCollectiveMembers(
    collectiveId: number
  ): Promise<(AiFollower & { collectiveMemberId: number })[]> {
    return this.collectiveMembers
      .filter((member) => member.collectiveId === collectiveId)
      .flatMap((member) => {
        const follower = this.followers.find((f) => f.id === member.aiFollowerId);
        if (!follower) return [];
        return [{ ...follower, collectiveMemberId: member.id }];
      });
  }

  async removeFollowerFromCollective(collectiveId: number, aiFollowerId: number): Promise<void> {
    this.collectiveMembers = this.collectiveMembers.filter(
      (member) => !(member.collectiveId === collectiveId && member.aiFollowerId === aiFollowerId)
    );
  }

  async getFollowerCollectives(aiFollowerId: number): Promise<AiFollowerCollective[]> {
    const collectiveIds = new Set(
      this.collectiveMembers
        .filter((member) => member.aiFollowerId === aiFollowerId)
        .map((member) => member.collectiveId)
    );
    return this.collectives.filter((collective) => collectiveIds.has(collective.id));
  }

  async createCircle(userId: number, circle: InsertCircle): Promise<Circle> {
    const newCircle: Circle = {
      id: this.nextId(this.circles),
      userId,
      name: circle.name,
      description: circle.description ?? null,
      icon: circle.icon ?? null,
      color: circle.color ?? null,
      visibility: circle.visibility ?? 'private',
      isDefault: false,
      createdAt: new Date(),
      addedAt: null,
    };
    this.circles.push(newCircle);
    return newCircle;
  }

  async getCircle(id: number): Promise<Circle | undefined> {
    return this.circles.find((circle) => circle.id === id);
  }

  async getUserCircles(userId: number): Promise<{
    owned: Circle[];
    shared: Circle[];
    invited: Circle[];
  }> {
    const owned = this.circles.filter((circle) => circle.userId === userId);
    const memberCircleIds = new Set(
      this.circleMembers
        .filter((member) => member.userId === userId && member.status === 'active')
        .map((member) => member.circleId)
    );
    const shared = this.circles.filter(
      (circle) => circle.userId !== userId && memberCircleIds.has(circle.id)
    );
    const invitedIds = new Set(
      this.circleInvitations
        .filter((inv) => inv.inviteeId === userId && inv.status === 'pending')
        .map((inv) => inv.circleId)
    );
    const invited = this.circles.filter((circle) => invitedIds.has(circle.id));
    return { owned, shared, invited };
  }

  async updateCircle(id: number, updates: Partial<InsertCircle>): Promise<Circle> {
    const circle = await this.getCircle(id);
    if (!circle) throw new Error(`Circle ${id} not found`);
    Object.assign(circle, updates);
    return circle;
  }

  async deleteCircle(id: number): Promise<void> {
    this.circles = this.circles.filter((circle) => circle.id !== id);
  }

  async getDefaultCircle(userId: number): Promise<Circle> {
    const existing = this.circles.find((circle) => circle.userId === userId && circle.isDefault);
    if (existing) return existing;
    return this.createCircle(userId, { name: 'Default Circle', visibility: 'private' });
  }

  async setDefaultCircle(userId: number, circleId: number): Promise<Circle> {
    for (const circle of this.circles) {
      if (circle.userId === userId) circle.isDefault = circle.id === circleId;
    }
    const circle = await this.getCircle(circleId);
    if (!circle) throw new Error(`Circle ${circleId} not found`);
    return circle;
  }

  async addFollowerToCircle(circleId: number, aiFollowerId: number): Promise<CircleFollower> {
    const link: CircleFollower = {
      id: this.nextId(this.circleFollowers),
      circleId,
      aiFollowerId,
      addedAt: new Date(),
      muted: false,
    };
    this.circleFollowers.push(link);
    return link;
  }

  async removeFollowerFromCircle(circleId: number, aiFollowerId: number): Promise<void> {
    this.circleFollowers = this.circleFollowers.filter(
      (link) => !(link.circleId === circleId && link.aiFollowerId === aiFollowerId)
    );
  }

  async getCircleFollowers(circleId: number): Promise<(AiFollower & { muted?: boolean })[]> {
    return this.circleFollowers
      .filter((link) => link.circleId === circleId)
      .flatMap((link) => {
        const follower = this.followers.find((f) => f.id === link.aiFollowerId);
        if (!follower) return [];
        return [{ ...follower, muted: link.muted }];
      });
  }

  async toggleFollowerMuteInCircle(
    circleId: number,
    aiFollowerId: number,
    muted?: boolean
  ): Promise<CircleFollower> {
    const link = this.circleFollowers.find(
      (item) => item.circleId === circleId && item.aiFollowerId === aiFollowerId
    );
    if (!link) throw new Error('Circle follower link not found');
    link.muted = muted ?? !link.muted;
    return link;
  }

  async addCollectiveToCircle(circleId: number, collectiveId: number): Promise<CircleCollective> {
    const link: CircleCollective = {
      id: this.nextId(this.circleCollectives),
      circleId,
      collectiveId,
      addedAt: new Date(),
    };
    this.circleCollectives.push(link);
    return link;
  }

  async removeCollectiveFromCircle(circleId: number, collectiveId: number): Promise<void> {
    this.circleCollectives = this.circleCollectives.filter(
      (link) => !(link.circleId === circleId && link.collectiveId === collectiveId)
    );
  }

  async getCircleCollectives(circleId: number): Promise<AiFollowerCollective[]> {
    const ids = new Set(
      this.circleCollectives
        .filter((link) => link.circleId === circleId)
        .map((link) => link.collectiveId)
    );
    return this.collectives.filter((collective) => ids.has(collective.id));
  }

  async addCircleCollective(circleId: number, collectiveId: number): Promise<CircleCollective> {
    return this.addCollectiveToCircle(circleId, collectiveId);
  }

  async removeCircleCollective(circleId: number, collectiveId: number): Promise<void> {
    return this.removeCollectiveFromCircle(circleId, collectiveId);
  }

  async createPostInCircle(
    userId: number,
    circleId: number,
    content: string,
    labId?: number,
    labExperiment?: boolean,
    targetRole?: 'control' | 'treatment' | 'observation' | 'all'
  ): Promise<Post> {
    const newPost: Post = {
      id: this.nextId(this.posts),
      userId,
      circleId,
      content,
      labId: labId ?? null,
      labExperiment: labExperiment ?? null,
      targetRole: targetRole ?? null,
      createdAt: new Date(),
    };
    this.posts.push(newPost);
    return newPost;
  }

  async getCirclePosts(circleId: number): Promise<Post[]> {
    return this.posts
      .filter((post) => post.circleId === circleId)
      .sort((a, b) => dateTime(b.createdAt) - dateTime(a.createdAt));
  }

  async movePostToCircle(postId: number, circleId: number): Promise<Post> {
    const post = await this.getPost(postId);
    if (!post) throw new Error(`Post ${postId} not found`);
    post.circleId = circleId;
    return post;
  }

  async updatePost(postId: number, updates: Partial<Post>): Promise<Post> {
    const post = await this.getPost(postId);
    if (!post) throw new Error(`Post ${postId} not found`);
    Object.assign(post, updates);
    return post;
  }

  async addCircleMember(member: InsertCircleMember): Promise<CircleMember> {
    const newMember: CircleMember = {
      id: this.nextId(this.circleMembers),
      circleId: member.circleId,
      userId: member.userId,
      role: member.role,
      status: member.status ?? 'active',
      joinedAt: new Date(),
    };
    this.circleMembers.push(newMember);
    return newMember;
  }

  async removeCircleMember(circleId: number, userId: number): Promise<void> {
    this.circleMembers = this.circleMembers.filter(
      (member) => !(member.circleId === circleId && member.userId === userId)
    );
  }

  async getCircleMembers(
    circleId: number,
    status: 'active' | 'deactivated' | 'all'
  ): Promise<CircleMember[]> {
    return this.circleMembers.filter((member) => {
      if (member.circleId !== circleId) return false;
      if (status === 'all') return true;
      return member.status === status;
    });
  }

  async createCircleInvitation(
    invitation: Omit<InsertCircleInvitation, 'status'>
  ): Promise<CircleInvitation> {
    const newInvitation: CircleInvitation = {
      id: this.nextId(this.circleInvitations),
      circleId: invitation.circleId,
      inviteeId: invitation.inviteeId,
      role: invitation.role,
      inviterId: 0,
      status: 'pending',
      createdAt: new Date(),
      respondedAt: null,
    };
    this.circleInvitations.push(newInvitation);
    return newInvitation;
  }

  async getCircleInvitation(id: number): Promise<CircleInvitation | undefined> {
    return this.circleInvitations.find((invitation) => invitation.id === id);
  }

  async getCircleInvitations(circleId: number): Promise<CircleInvitation[]> {
    return this.circleInvitations.filter((invitation) => invitation.circleId === circleId);
  }

  async getUserPendingInvitations(userId: number): Promise<CircleInvitation[]> {
    return this.circleInvitations.filter(
      (invitation) => invitation.inviteeId === userId && invitation.status === 'pending'
    );
  }

  async updateInvitationStatus(
    id: number,
    status: 'accepted' | 'declined'
  ): Promise<CircleInvitation> {
    const invitation = await this.getCircleInvitation(id);
    if (!invitation) throw new Error(`Invitation ${id} not found`);
    invitation.status = status;
    invitation.respondedAt = new Date();
    return invitation;
  }

  async getCircleWithDetails(id: number): Promise<
    | {
        circle: Circle;
        owner: User;
        members: (CircleMember & { username: string })[];
        followers: (AiFollower & { muted?: boolean })[];
        collectives: AiFollowerCollective[];
      }
    | undefined
  > {
    const circle = await this.getCircle(id);
    if (!circle) return undefined;
    const owner = await this.getUser(circle.userId);
    if (!owner) return undefined;
    const members = (await this.getCircleMembers(id, 'active')).map((member) => {
      const user = this.users.find((u) => u.id === member.userId);
      return { ...member, username: user?.username ?? 'unknown' };
    });
    const followers = await this.getCircleFollowers(id);
    const collectives = await this.getCircleCollectives(id);
    return { circle, owner, members, followers, collectives };
  }

  async deactivateCircleMember(circleId: number, userId: number): Promise<void> {
    const member = this.circleMembers.find(
      (item) => item.circleId === circleId && item.userId === userId
    );
    if (member) member.status = 'deactivated';
  }

  async reactivateCircleMember(circleId: number, userId: number): Promise<void> {
    const member = this.circleMembers.find(
      (item) => item.circleId === circleId && item.userId === userId
    );
    if (member) member.status = 'active';
  }

  async getDeactivatedCircles(userId: number): Promise<Circle[]> {
    const deactivatedIds = new Set(
      this.circleMembers
        .filter((member) => member.userId === userId && member.status === 'deactivated')
        .map((member) => member.circleId)
    );
    return this.circles.filter((circle) => deactivatedIds.has(circle.id));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification: Notification = {
      id: this.nextId(this.notifications),
      userId: notification.userId,
      type: notification.type,
      content: notification.content,
      // InsertNotification.metadata is widened by zod; align to Notification.metadata
      metadata: (notification.metadata ?? null) as Notification['metadata'],
      read: false,
      createdAt: new Date(),
    };
    this.notifications.push(newNotification);
    return newNotification;
  }

  async createLabExperimentNotification(
    labId: number,
    postId: number,
    targetRole: 'control' | 'treatment' | 'observation' | 'all'
  ): Promise<void> {
    const lab = await this.getLab(labId);
    if (!lab) return;
    await this.createNotification({
      userId: lab.userId,
      type: 'lab_experiment',
      content: `Lab experiment notification for post ${postId} (${targetRole})`,
      metadata: { labId, sourceId: postId, sourceType: 'post', circleRole: targetRole },
    });
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return this.notifications
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => dateTime(b.createdAt) - dateTime(a.createdAt));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    return this.notifications.filter((n) => n.userId === userId && !n.read).length;
  }

  async markNotificationRead(id: number): Promise<void> {
    const notification = this.notifications.find((item) => item.id === id);
    if (notification) notification.read = true;
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    for (const notification of this.notifications) {
      if (notification.userId === userId) notification.read = true;
    }
  }

  async deleteNotification(id: number): Promise<void> {
    this.notifications = this.notifications.filter((notification) => notification.id !== id);
  }

  async deleteAllNotifications(userId: number): Promise<void> {
    this.notifications = this.notifications.filter((notification) => notification.userId !== userId);
  }

  async createDirectChatMessage(
    message: Omit<InsertDirectChat, 'createdAt'>
  ): Promise<DirectChat> {
    const newMessage: DirectChat = {
      id: this.nextId(this.directMessages),
      userId: message.userId,
      aiFollowerId: message.aiFollowerId,
      content: message.content,
      isUserMessage: message.isUserMessage,
      // InsertDirectChat.toolsUsed is widened by zod; align to DirectChat.toolsUsed
      toolsUsed: (message.toolsUsed ?? null) as DirectChat['toolsUsed'],
      createdAt: new Date(),
    };
    this.directMessages.push(newMessage);
    return newMessage;
  }

  async getDirectChatHistory(
    userId: number,
    aiFollowerId: number,
    limit = 50
  ): Promise<DirectChat[]> {
    return this.directMessages
      .filter((msg) => msg.userId === userId && msg.aiFollowerId === aiFollowerId)
      .sort((a, b) => dateTime(b.createdAt) - dateTime(a.createdAt))
      .slice(0, limit);
  }

  async createLab(userId: number, lab: InsertLab): Promise<Lab> {
    const newLab: Lab = {
      id: this.nextId(this.labs),
      userId,
      name: lab.name,
      description: lab.description ?? null,
      circleId: lab.circleId ?? null,
      experimentType: lab.experimentType,
      status: 'draft',
      goals: lab.goals ?? null,
      // InsertLab.successMetrics is widened by zod; align to Lab.successMetrics
      successMetrics: (lab.successMetrics ?? null) as Lab['successMetrics'],
      createdAt: new Date(),
      launchedAt: null,
      completedAt: null,
      updatedAt: new Date(),
    };
    this.labs.push(newLab);
    return newLab;
  }

  async getLab(id: number): Promise<Lab | undefined> {
    return this.labs.find((lab) => lab.id === id);
  }

  async getUserLabs(userId: number): Promise<Lab[]> {
    return this.labs.filter((lab) => lab.userId === userId);
  }

  async updateLab(id: number, updates: Partial<Lab>): Promise<Lab> {
    const lab = await this.getLab(id);
    if (!lab) throw new Error(`Lab ${id} not found`);
    Object.assign(lab, updates, { updatedAt: new Date() });
    return lab;
  }

  async deleteLab(id: number): Promise<void> {
    this.labs = this.labs.filter((lab) => lab.id !== id);
  }

  async duplicateLab(id: number, newName?: string): Promise<Lab> {
    const original = await this.getLab(id);
    if (!original) throw new Error(`Lab ${id} not found`);
    return this.createLab(original.userId, {
      name: newName ?? `${original.name} (copy)`,
      description: original.description,
      experimentType: original.experimentType,
      goals: original.goals,
      successMetrics: original.successMetrics,
      circleId: original.circleId,
    });
  }

  async updateLabStatus(
    id: number,
    status: 'draft' | 'active' | 'completed' | 'archived'
  ): Promise<Lab> {
    return this.updateLab(id, { status });
  }

  async addCircleToLab(
    labId: number,
    circleId: number,
    role: 'control' | 'treatment' | 'observation' = 'treatment'
  ): Promise<LabCircle> {
    const link: LabCircle = {
      id: this.nextId(this.labCircles),
      labId,
      circleId,
      role,
      addedAt: new Date(),
    };
    this.labCircles.push(link);
    return link;
  }

  async getLabCircles(labId: number): Promise<(Circle & LabCircle)[]> {
    return this.labCircles
      .filter((link) => link.labId === labId)
      .flatMap((link) => {
        const circle = this.circles.find((c) => c.id === link.circleId);
        if (!circle) return [];
        return [{ ...circle, ...link }];
      });
  }

  async getLabCirclesWithStats(labId: number): Promise<
    (Circle & {
      role: 'control' | 'treatment' | 'observation';
      memberCount: number;
      followerCount: number;
      addedAt: Date;
    })[]
  > {
    const links = await this.getLabCircles(labId);
    return Promise.all(
      links.map(async (link) => ({
        ...link,
        role: link.role,
        memberCount: await this.getCircleMemberCount(link.circleId),
        followerCount: await this.getCircleFollowerCount(link.circleId),
        addedAt: link.addedAt ?? new Date(),
      }))
    );
  }

  async getCircleLabs(
    circleId: number
  ): Promise<(Lab & { role: 'control' | 'treatment' | 'observation' })[]> {
    return this.labCircles
      .filter((link) => link.circleId === circleId)
      .flatMap((link) => {
        const lab = this.labs.find((item) => item.id === link.labId);
        if (!lab) return [];
        return [{ ...lab, role: link.role }];
      });
  }

  async getLabsForCircle(circleId: number): Promise<Lab[]> {
    const withRoles = await this.getCircleLabs(circleId);
    return withRoles.map(({ role: _role, ...lab }) => lab as Lab);
  }

  async removeCircleFromLab(labId: number, circleId: number): Promise<void> {
    this.labCircles = this.labCircles.filter(
      (link) => !(link.labId === labId && link.circleId === circleId)
    );
  }

  async updateLabCircleRole(
    labId: number,
    circleId: number,
    role: 'control' | 'treatment' | 'observation'
  ): Promise<LabCircle> {
    const link = this.labCircles.find(
      (item) => item.labId === labId && item.circleId === circleId
    );
    if (!link) throw new Error('Lab circle link not found');
    link.role = role;
    return link;
  }

  async grantCircleAccessToUser(
    userId: number,
    circleId: number,
    role: 'collaborator' | 'viewer'
  ): Promise<CircleMember> {
    return this.addCircleMember({ circleId, userId, role, status: 'active' });
  }

  async createLabContent(labId: number, content: InsertLabContent): Promise<LabContent> {
    const newContent: LabContent = {
      id: this.nextId(this.labContents),
      labId,
      content: content.content,
      circleId: content.circleId ?? null,
      targetRole: content.targetRole ?? 'all',
      createdAt: new Date(),
    };
    this.labContents.push(newContent);
    return newContent;
  }

  async getLabContent(labId: number): Promise<LabContent[]> {
    return this.labContents.filter((content) => content.labId === labId);
  }

  async updateLabContent(id: number, updates: Partial<LabContent>): Promise<LabContent> {
    const content = this.labContents.find((item) => item.id === id);
    if (!content) throw new Error(`Lab content ${id} not found`);
    Object.assign(content, updates);
    return content;
  }

  async deleteLabContent(id: number): Promise<void> {
    this.labContents = this.labContents.filter((content) => content.id !== id);
  }

  async publishLabContent(labId: number): Promise<void> {
    const lab = await this.getLab(labId);
    if (!lab) return;
    const contents = await this.getLabContent(labId);
    for (const content of contents) {
      const circleId = content.circleId ?? lab.circleId;
      if (circleId == null) continue;
      await this.createPostInCircle(
        lab.userId,
        circleId,
        content.content,
        labId,
        true,
        content.targetRole
      );
    }
  }

  async getLabPosts(
    labId: number,
    targetRole?: 'control' | 'treatment' | 'observation' | 'all'
  ): Promise<Post[]> {
    return this.posts.filter((post) => {
      if (post.labId !== labId) return false;
      if (!targetRole || targetRole === 'all') return true;
      return post.targetRole === targetRole || post.targetRole === 'all';
    });
  }

  async getCircleRoleInLab(
    labId: number,
    circleId: number
  ): Promise<'control' | 'treatment' | 'observation' | undefined> {
    return this.labCircles.find((link) => link.labId === labId && link.circleId === circleId)
      ?.role;
  }

  async getLabCirclesByRole(
    labId: number,
    role: 'control' | 'treatment' | 'observation'
  ): Promise<Circle[]> {
    const circleIds = new Set(
      this.labCircles
        .filter((link) => link.labId === labId && link.role === role)
        .map((link) => link.circleId)
    );
    return this.circles.filter((circle) => circleIds.has(circle.id));
  }

  async getLabAnalysisResult(labId: number): Promise<LabAnalysisResult | undefined> {
    return this.labAnalysisResults.find((result) => result.labId === labId);
  }

  async saveLabAnalysisResult(
    labId: number,
    metricResults: LabAnalysisResult['metricResults'],
    recommendation: LabAnalysisResult['recommendation']
  ): Promise<LabAnalysisResult> {
    const existing = await this.getLabAnalysisResult(labId);
    if (existing) {
      existing.metricResults = metricResults;
      existing.recommendation = recommendation;
      existing.updatedAt = new Date();
      return existing;
    }
    const result: LabAnalysisResult = {
      id: this.nextId(this.labAnalysisResults),
      labId,
      metricResults,
      recommendation,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.labAnalysisResults.push(result);
    return result;
  }

  async deleteLabAnalysisResult(labId: number): Promise<void> {
    this.labAnalysisResults = this.labAnalysisResults.filter((result) => result.labId !== labId);
  }

  async getCirclePostCount(circleId: number): Promise<number> {
    return this.posts.filter((post) => post.circleId === circleId).length;
  }

  async getCircleFollowerCount(circleId: number): Promise<number> {
    return this.circleFollowers.filter((link) => link.circleId === circleId).length;
  }

  async getCircleMemberCount(circleId: number): Promise<number> {
    return this.circleMembers.filter(
      (member) => member.circleId === circleId && member.status === 'active'
    ).length;
  }
}

export const mockStorage = new MockStorage();
