export interface JWTPayload {
  sub: string;
  role: 'candidate' | 'recruiter';
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface SignupBody {
  email: string;
  password: string;
  fullName?: string;
}

export interface RefreshBody {
  refreshToken: string;
}
