import { MessageType, UiMessageType } from "./shared";

const pluginName = "bluesky";
const BLUESKY_SERVICE_URL = "https://bsky.social/xrpc";
const BLUESKY_PUBLIC_API = "https://public.api.bsky.app/xrpc";

// Storage keys
const BLUESKY_IDENTIFIER_KEY = "bluesky_identifier";
const BLUESKY_PASSWORD_KEY = "bluesky_password";
const BLUESKY_ACCESS_TOKEN_KEY = "bluesky_access_token";
const BLUESKY_REFRESH_TOKEN_KEY = "bluesky_refresh_token";
const BLUESKY_DID_KEY = "bluesky_did";

// Types for Bluesky API responses
interface BlueskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface BlueskyPostRecord {
  text?: string;
  createdAt?: string;
}

interface BlueskyEmbed {
  external?: {
    uri?: string;
    thumb?: string;
  };
  images?: Array<{
    thumb?: string;
    fullsize?: string;
    alt?: string;
  }>;
}

interface BlueskyPostView {
  uri: string;
  cid: string;
  author: BlueskyAuthor;
  record: BlueskyPostRecord;
  embed?: BlueskyEmbed;
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  indexedAt: string;
}

interface BlueskyFeedViewPost {
  post: BlueskyPostView;
  reply?: {
    root: BlueskyPostView;
    parent: BlueskyPostView;
  };
}

interface BlueskyFeedResponse {
  feed: BlueskyFeedViewPost[];
  cursor?: string;
}

interface BlueskySearchResponse {
  posts: BlueskyPostView[];
  cursor?: string;
}

interface BlueskyProfileResponse {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

interface BlueskyAuthorFeedResponse {
  feed: BlueskyFeedViewPost[];
  cursor?: string;
}

interface BlueskyThreadViewPost {
  post: BlueskyPostView;
  replies?: BlueskyThreadViewPost[];
}

interface BlueskyThreadResponse {
  thread: BlueskyThreadViewPost;
}

interface BlueskySession {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle: string;
}

// State
let accessToken = localStorage.getItem(BLUESKY_ACCESS_TOKEN_KEY) || "";
let refreshToken = localStorage.getItem(BLUESKY_REFRESH_TOKEN_KEY) || "";
let userDid = localStorage.getItem(BLUESKY_DID_KEY) || "";

const hasLogin = (): boolean => {
  return !!accessToken;
};

const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (hasLogin()) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
};

const getPublicHeaders = (): HeadersInit => {
  return {
    Accept: "application/json",
  };
};

// Convert Bluesky post to SocialGata Post format
const blueskyPostToPost = (post: BlueskyPostView): Post => {
  return {
    apiId: post.uri,
    body: post.record?.text || "",
    authorName: post.author?.displayName || post.author?.handle || "",
    authorApiId: post.author?.handle || "",
    authorAvatar: post.author?.avatar,
    score: post.likeCount || 0,
    numOfComments: post.replyCount || 0,
    publishedDate: post.record?.createdAt || post.indexedAt,
    pluginId: pluginName,
    url: post.embed?.external?.uri,
    thumbnailUrl: post.embed?.external?.thumb || post.embed?.images?.[0]?.thumb,
  };
};

// Convert thread reply to Post with nested comments
const threadReplyToPost = (threadPost: BlueskyThreadViewPost): Post => {
  const post = blueskyPostToPost(threadPost.post);
  post.comments =
    threadPost.replies
      ?.filter((r) => r.post)
      .map((r) => threadReplyToPost(r)) ?? [];
  return post;
};

// Refresh access token using refresh token
const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshToken) return false;

  try {
    const response = await application.networkRequest(
      `${BLUESKY_SERVICE_URL}/com.atproto.server.refreshSession`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );

    if (!response.ok) {
      // Clear tokens if refresh fails
      accessToken = "";
      refreshToken = "";
      userDid = "";
      localStorage.removeItem(BLUESKY_ACCESS_TOKEN_KEY);
      localStorage.removeItem(BLUESKY_REFRESH_TOKEN_KEY);
      localStorage.removeItem(BLUESKY_DID_KEY);
      return false;
    }

    const session: BlueskySession = await response.json();
    accessToken = session.accessJwt;
    refreshToken = session.refreshJwt;
    localStorage.setItem(BLUESKY_ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(BLUESKY_REFRESH_TOKEN_KEY, refreshToken);
    return true;
  } catch {
    return false;
  }
};

// Make authenticated request with automatic token refresh
const makeAuthenticatedRequest = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  let response = await application.networkRequest(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  // If unauthorized, try to refresh token
  if (response.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await application.networkRequest(url, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options?.headers,
        },
      });
    }
  }

  return response;
};

// Plugin Methods

const getFeed = async (request?: GetFeedRequest): Promise<GetFeedResponse> => {
  try {
    if (hasLogin()) {
      // Get authenticated user's timeline
      const url = new URL(`${BLUESKY_SERVICE_URL}/app.bsky.feed.getTimeline`);
      url.searchParams.append("limit", "30");
      if (request?.pageInfo?.page) {
        url.searchParams.append("cursor", String(request.pageInfo.page));
      }

      const response = await makeAuthenticatedRequest(url.toString());
      const json: BlueskyFeedResponse = await response.json();

      const items: Post[] = json.feed.map((item) =>
        blueskyPostToPost(item.post)
      );

      return {
        items,
        pageInfo: {
          nextPage: json.cursor,
        },
      };
    } else {
      // Get public "What's Hot" feed when not authenticated
      const url = new URL(`${BLUESKY_PUBLIC_API}/app.bsky.feed.getFeed`);
      url.searchParams.append(
        "feed",
        "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot"
      );
      url.searchParams.append("limit", "30");
      if (request?.pageInfo?.page) {
        url.searchParams.append("cursor", String(request.pageInfo.page));
      }

      const response = await application.networkRequest(url.toString(), {
        headers: getPublicHeaders(),
      });
      const json: BlueskyFeedResponse = await response.json();

      const items: Post[] = json.feed.map((item) =>
        blueskyPostToPost(item.post)
      );

      return {
        items,
        pageInfo: {
          nextPage: json.cursor,
        },
      };
    }
  } catch (error) {
    console.error("Error fetching Bluesky feed:", error);
    return { items: [] };
  }
};

const getUser = async (request: GetUserRequest): Promise<GetUserResponse> => {
  try {
    // Resolve handle to DID
    const resolveUrl = new URL(
      `${BLUESKY_PUBLIC_API}/com.atproto.identity.resolveHandle`
    );
    resolveUrl.searchParams.append("handle", request.apiId);
    const resolveResponse = await application.networkRequest(
      resolveUrl.toString(),
      {
        headers: getPublicHeaders(),
      }
    );
    const resolveJson: { did: string } = await resolveResponse.json();
    const did = resolveJson.did;

    // Get profile
    const profileUrl = new URL(`${BLUESKY_PUBLIC_API}/app.bsky.actor.getProfile`);
    profileUrl.searchParams.append("actor", did);
    const profileResponse = await application.networkRequest(
      profileUrl.toString(),
      {
        headers: getPublicHeaders(),
      }
    );
    const profile: BlueskyProfileResponse = await profileResponse.json();

    // Get author's feed
    const feedUrl = new URL(`${BLUESKY_PUBLIC_API}/app.bsky.feed.getAuthorFeed`);
    feedUrl.searchParams.append("actor", did);
    feedUrl.searchParams.append("limit", "30");
    const feedResponse = await application.networkRequest(feedUrl.toString(), {
      headers: getPublicHeaders(),
    });
    const feedJson: BlueskyAuthorFeedResponse = await feedResponse.json();

    const items: Post[] = feedJson.feed.map((item) =>
      blueskyPostToPost(item.post)
    );

    return {
      user: {
        apiId: profile.did,
        name: profile.displayName || profile.handle,
        avatar: profile.avatar,
      },
      items,
    };
  } catch (error) {
    console.error("Error fetching Bluesky user:", error);
    return { items: [] };
  }
};

const search = async (request: SearchRequest): Promise<SearchResponse> => {
  try {
    const url = new URL(`${BLUESKY_PUBLIC_API}/app.bsky.feed.searchPosts`);
    url.searchParams.append("q", request.query);
    url.searchParams.append("limit", "30");
    if (request.pageInfo?.page) {
      url.searchParams.append("cursor", String(request.pageInfo.page));
    }

    const response = await application.networkRequest(url.toString(), {
      headers: getPublicHeaders(),
    });
    const json: BlueskySearchResponse = await response.json();

    const items: Post[] = json.posts.map((post) => blueskyPostToPost(post));

    return {
      items,
      pageInfo: {
        nextPage: json.cursor,
      },
    };
  } catch (error) {
    console.error("Error searching Bluesky posts:", error);
    return { items: [] };
  }
};

const getComments = async (
  request: GetCommentsRequest
): Promise<GetCommentsResponse> => {
  try {
    if (!request.apiId) {
      return { items: [] };
    }
    const url = new URL(`${BLUESKY_PUBLIC_API}/app.bsky.feed.getPostThread`);
    url.searchParams.append("uri", request.apiId);
    url.searchParams.append("depth", "10");

    const response = await application.networkRequest(url.toString(), {
      headers: getPublicHeaders(),
    });
    const json: BlueskyThreadResponse = await response.json();

    const post = blueskyPostToPost(json.thread.post);
    const items: Post[] =
      json.thread.replies
        ?.filter((r) => r.post)
        .map((r) => threadReplyToPost(r)) ?? [];

    return {
      post,
      items,
    };
  } catch (error) {
    console.error("Error fetching Bluesky comments:", error);
    return { items: [] };
  }
};

const login = async (request: LoginRequest): Promise<void> => {
  try {
    const response = await application.networkRequest(
      `${BLUESKY_SERVICE_URL}/com.atproto.server.createSession`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: request.apiKey, // Use apiKey as username/handle
          password: request.apiSecret, // Use apiSecret as app password
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const session: BlueskySession = await response.json();
    accessToken = session.accessJwt;
    refreshToken = session.refreshJwt;
    userDid = session.did;

    localStorage.setItem(BLUESKY_ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(BLUESKY_REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(BLUESKY_DID_KEY, userDid);
  } catch (error) {
    console.error("Error logging into Bluesky:", error);
    throw error;
  }
};

const logout = async (): Promise<void> => {
  accessToken = "";
  refreshToken = "";
  userDid = "";
  localStorage.removeItem(BLUESKY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(BLUESKY_REFRESH_TOKEN_KEY);
  localStorage.removeItem(BLUESKY_DID_KEY);
};

const isLoggedIn = async (): Promise<boolean> => {
  return hasLogin();
};

// UI Message handling
const sendMessage = (message: MessageType) => {
  application.postUiMessage(message);
};

const getInfo = async () => {
  const identifier = localStorage.getItem(BLUESKY_IDENTIFIER_KEY) || "";
  const password = localStorage.getItem(BLUESKY_PASSWORD_KEY) || "";
  sendMessage({
    type: "info",
    identifier,
    password,
    isLoggedIn: hasLogin(),
  });
};

// Theme handling
const changeTheme = (theme: Theme) => {
  localStorage.setItem("vite-ui-theme", theme);
};

// Initialize plugin
const init = async () => {
  const token = localStorage.getItem(BLUESKY_ACCESS_TOKEN_KEY);
  const refresh = localStorage.getItem(BLUESKY_REFRESH_TOKEN_KEY);
  const did = localStorage.getItem(BLUESKY_DID_KEY);

  if (token) {
    accessToken = token;
  }
  if (refresh) {
    refreshToken = refresh;
  }
  if (did) {
    userDid = did;
  }

  const theme = await application.getTheme();
  changeTheme(theme);
};

// Wire up plugin handlers
application.onGetFeed = getFeed;
application.onGetComments = getComments;
application.onGetUser = getUser;
application.onSearch = search;
application.onLogin = login;
application.onLogout = logout;
application.onIsLoggedIn = isLoggedIn;
application.onGetPlatformType = async () => "microblog";

application.onUiMessage = async (message: UiMessageType) => {
  switch (message.type) {
    case "check-login":
      getInfo();
      break;
    case "save":
      localStorage.setItem(BLUESKY_IDENTIFIER_KEY, message.identifier);
      localStorage.setItem(BLUESKY_PASSWORD_KEY, message.password);
      application.createNotification({ message: "Settings saved!" });
      break;
    default:
      const _exhaustive: never = message;
      break;
  }
};

application.onChangeTheme = async (theme: Theme) => {
  changeTheme(theme);
};

application.onPostLogin = init;
init();
