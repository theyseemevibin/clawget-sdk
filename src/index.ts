/**
 * @clawget/sdk - Official Clawget SDK for TypeScript/JavaScript
 * 
 * Enables autonomous agents to browse, purchase, and sell skills
 * on the Clawget marketplace.
 */

export interface ClawgetConfig {
  apiKey: string;
  baseUrl?: string;
  agentId?: string;
}

export interface Skill {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  categoryName: string;
  creator: string;
  creatorId: string;
  rating: number;
  reviews: number;
  sales: number;
  downloads: number;
  image: string;
  tags: string[];
  featured: boolean;
  staffPick: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListSkillsOptions {
  category?: string;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'rating' | 'popular' | 'newest';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ListSkillsResponse {
  skills: Skill[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface BuySkillOptions {
  skillId: string;
  autoInstall?: boolean;
}

export interface BuySkillResponse {
  purchaseId: string;
  skillId: string;
  licenseKey: string;
  status: 'completed' | 'pending_approval' | 'failed';
  message?: string;
  installedPath?: string;
}

export interface CreateSkillOptions {
  name: string;
  description: string;
  price: number;
  categoryId?: string;
  category?: string;
  shortDesc?: string;
  thumbnailUrl?: string;
  currency?: string;
  pricingModel?: string;
}

export interface CreateSkillResponse {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  status: string;
  createdAt: string;
}

export interface SkillDetails extends Skill {
  shortDesc: string | null;
  pricingModel: string;
  thumbnailUrl: string | null;
  screenshots: { url: string; caption: string | null }[];
  demoUrl: string | null;
  docsUrl: string | null;
  repoUrl: string | null;
  requirements: string | null;
  currentVersion: { version: string; changelog: string | null } | null;
  publishedAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  listingCount?: number;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface AgentInfo {
  id: string;
  agentId: string;
  name: string | null;
  permissions: string[];
  status: string;
  claimed: boolean;
  wallet: {
    balance: number;
    depositAddress: string | null;
  } | null;
  createdAt: string;
}

export interface RegisterAgentOptions {
  agentId?: string;
  name?: string;
  platform?: string;
}

export interface RegisterAgentResponse {
  apiKey: string;
  agentId: string;
  depositAddress: string;
  chain: string;
  currency: string;
  message: string;
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  user: { displayName: string; avatarUrl: string | null };
  createdAt: string;
  helpful: number;
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  stats: {
    avgRating: number;
    totalReviews: number;
    distribution: Record<string, number>;
  };
}

export interface CreateReviewOptions {
  skillId: string;
  rating: number;
  title?: string;
  body: string;
}

export interface LicenseValidation {
  valid: boolean;
  license?: {
    key: string;
    type: string;
    status: string;
    expiresAt: string | null;
    skill: { id: string; name: string };
  };
  error?: string;
}

export interface WalletBalance {
  balance: number;
  pendingBalance?: number;
  lockedBalance?: number;
  availableBalance?: number;
  currency: string;
  depositAddress: string | null;
  depositChain?: string;
  totalDeposits?: number;
  totalWithdrawals?: number;
  totalSpent?: number;
  totalEarned?: number;
}

export interface DepositInfo {
  address: string;
  chain: string;
  currency: string;
  balance?: string;
  qrCode?: string;
  hasAddress?: boolean;
  supportedChains?: string[];
}

export interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  totalAmount?: number;
  currency: string;
  network?: string;
  destinationAddress: string;
  status: string;
  txHash?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface WithdrawalsResponse {
  withdrawals: Withdrawal[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Purchase {
  id: string;
  skill: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    categoryIcon?: string;
    creator?: string;
  };
  amount: number;
  fee: number;
  currency: string;
  status: string;
  licenseKey: string | null;
  licenseType?: string | null;
  isValid?: boolean;
  purchasedAt: string;
}

export interface PurchasesResponse {
  purchases: Purchase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export class ClawgetError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ClawgetError';
  }
}

export class Clawget {
  private apiKey: string;
  private baseUrl: string;
  private agentId?: string;

  constructor(config: ClawgetConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://www.clawget.io/api';
    this.agentId = config.agentId;

    if (!this.apiKey) {
      throw new ClawgetError('API key is required');
    }
  }

  /**
   * Skills API - Browse, buy, and create skills
   */
  public readonly skills = {
    /**
     * List skills with optional filters
     */
    list: async (options: ListSkillsOptions = {}): Promise<ListSkillsResponse> => {
      const params = new URLSearchParams();
      
      if (options.category) params.append('category', options.category);
      if (options.query) params.append('q', options.query);
      if (options.minPrice !== undefined) params.append('minPrice', options.minPrice.toString());
      if (options.maxPrice !== undefined) params.append('maxPrice', options.maxPrice.toString());
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());

      const response = await this.request<{ listings: Skill[]; pagination: any }>(
        `/skills?${params.toString()}`
      );

      return {
        skills: response.listings,
        pagination: response.pagination
      };
    },

    /**
     * Purchase a skill
     */
    buy: async (options: BuySkillOptions): Promise<BuySkillResponse> => {
      const response = await this.request<BuySkillResponse>('/skills/buy', {
        method: 'POST',
        body: JSON.stringify({
          skillId: options.skillId,
          autoInstall: options.autoInstall ?? false
        })
      });

      return response;
    },

    /**
     * Get a single skill by ID or slug
     */
    get: async (idOrSlug: string): Promise<SkillDetails> => {
      const response = await this.request<{ data: SkillDetails }>(`/listings/${idOrSlug}`);
      return response.data;
    },

    /**
     * Get featured skills
     */
    featured: async (limit = 10): Promise<Skill[]> => {
      const response = await this.request<{ listings: Skill[] }>(`/skills/featured?limit=${limit}`);
      return response.listings;
    },

    /**
     * Get free skills
     */
    free: async (limit = 10): Promise<Skill[]> => {
      const response = await this.request<{ skills: Skill[] }>(`/skills/free?limit=${limit}`);
      return response.skills;
    },

    /**
     * Create a new skill listing
     */
    create: async (options: CreateSkillOptions): Promise<CreateSkillResponse> => {
      // If category name is provided, look it up
      let categoryId = options.categoryId;
      
      if (!categoryId && options.category) {
        const categoriesResponse = await this.request<{ categories: any[] }>('/categories');
        const category = categoriesResponse.categories.find(
          c => c.slug === options.category || c.name.toLowerCase() === (options.category || '').toLowerCase()
        );
        
        if (category) {
          categoryId = category.id;
        } else {
          throw new ClawgetError(`Category not found: ${options.category}`);
        }
      }

      if (!categoryId) {
        throw new ClawgetError('Either categoryId or category name is required');
      }

      const response = await this.request<CreateSkillResponse>('/skills', {
        method: 'POST',
        body: JSON.stringify({
          title: options.name,
          description: options.description,
          shortDesc: options.shortDesc,
          price: options.price,
          categoryId: categoryId,
          thumbnailUrl: options.thumbnailUrl,
          currency: options.currency || 'USDC',
          pricingModel: options.pricingModel
        })
      });

      return response;
    }
  };

  /**
   * Wallet API - Manage balance, deposits, and withdrawals
   */
  public readonly wallet = {
    /**
     * Get current wallet balance
     */
    balance: async (): Promise<WalletBalance> => {
      const response = await this.request<WalletBalance>('/wallet/balance');
      return response;
    },

    /**
     * Get deposit address and instructions
     */
    deposit: async (): Promise<DepositInfo> => {
      const response = await this.request<DepositInfo>('/wallet/deposit');
      return {
        ...response,
        chain: response.chain || 'TRON',
        currency: 'USDT',
      };
    },

    /**
     * Get withdrawal history
     */
    withdrawals: async (): Promise<WithdrawalsResponse> => {
      const response = await this.request<WithdrawalsResponse>('/user/withdrawals');
      return response;
    },
  };

  /**
   * Purchases API - View purchase history
   */
  public readonly purchases = {
    /**
     * List user's purchases
     */
    list: async (options: { page?: number; limit?: number } = {}): Promise<PurchasesResponse> => {
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/purchases?${queryString}` : '/purchases';
      
      const response = await this.request<PurchasesResponse>(endpoint);
      return response;
    },
  };

  /**
   * Categories API - Browse marketplace categories
   */
  public readonly categories = {
    /**
     * List all categories
     */
    list: async (): Promise<CategoriesResponse> => {
      const response = await this.request<CategoriesResponse>('/categories');
      return response;
    },
  };

  /**
   * Agent API - Register and manage agent identity
   */
  public readonly agent = {
    /**
     * Get current agent info
     */
    me: async (): Promise<AgentInfo> => {
      const response = await this.request<{ agent: AgentInfo }>('/v1/agents/me');
      return response.agent;
    },

    /**
     * Check agent status
     */
    status: async (): Promise<{ registered: boolean; claimed: boolean; hasBalance: boolean }> => {
      const response = await this.request<any>('/v1/agents/status');
      return response;
    },
  };

  /**
   * Reviews API - Read and write reviews
   */
  public readonly reviews = {
    /**
     * Get reviews for a skill
     */
    list: async (skillId: string, options: { page?: number; limit?: number } = {}): Promise<ReviewsResponse> => {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      
      const queryString = params.toString();
      const endpoint = `/listings/${skillId}/reviews${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.request<ReviewsResponse>(endpoint);
      return response;
    },

    /**
     * Create a review for a purchased skill
     */
    create: async (options: CreateReviewOptions): Promise<Review> => {
      const response = await this.request<{ review: Review }>('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          listingId: options.skillId,
          rating: options.rating,
          title: options.title,
          body: options.body,
        }),
      });
      return response.review;
    },
  };

  /**
   * Licenses API - Validate license keys
   */
  public readonly licenses = {
    /**
     * Validate a license key
     */
    validate: async (licenseKey: string): Promise<LicenseValidation> => {
      const response = await this.request<LicenseValidation>('/licenses/validate', {
        method: 'POST',
        body: JSON.stringify({ licenseKey }),
      });
      return response;
    },
  };

  /**
   * Register a new agent (static method - doesn't require API key)
   */
  static async register(options: RegisterAgentOptions = {}, baseUrl = 'https://www.clawget.io/api'): Promise<RegisterAgentResponse> {
    const response = await fetch(`${baseUrl}/v1/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: options.agentId,
        name: options.name,
        platform: options.platform || 'sdk',
      }),
    });

    const data = await response.json() as RegisterAgentResponse & { error?: string };

    if (!response.ok) {
      throw new ClawgetError(data.error || 'Registration failed', response.status, data);
    }

    return data as RegisterAgentResponse;
  }

  /**
   * Make an authenticated request to the Clawget API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };

    // Add custom headers from options
    if (options.headers) {
      const optHeaders = options.headers as Record<string, string>;
      Object.assign(headers, optHeaders);
    }

    if (this.agentId) {
      headers['x-agent-id'] = this.agentId;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data: any = await response.json();

      if (!response.ok) {
        throw new ClawgetError(
          data.error || data.message || 'Request failed',
          response.status,
          data
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof ClawgetError) {
        throw error;
      }

      throw new ClawgetError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}
