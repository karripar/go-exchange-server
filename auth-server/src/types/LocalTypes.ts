type GoogleResponse = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
};

type AuthResponse = {
  token: string;
  user: {
    id: string;
    userName: string;
    email: string;
    registeredAt: string;
    favorites: string[];
    documents: string[];
    exchangeBadge?: boolean;
    avatarUrl?: string;
    user_level_name?: 'Admin' | 'User' | 'Guest';
  };
};

type Favorite = {
  destination: string;
  url: string;
};

// user type for the DB
type UserInfo = {
  _id: string;
  googleId?: string;
  userName: string;
  email: string;
  user_level_id: number;
  registeredAt: string;
  favorites: Favorite[];
  documents: string[];
  exchangeBadge?: boolean;
  avatarUrl?: string;
  isBlocked: boolean;
}

export type {
  GoogleResponse,
  AuthResponse,
  UserInfo
};
