export enum UserVerifyStatus {
  Unverified = 0,
  Verified = 1,
  Banned = 2
}

export enum TokenType {
  AccessToken = 0,
  RefreshToken = 1,
  ForgotPasswordToken = 2,
  EmailVerifyToken = 3
}

export enum MediaType {
  Image = 0,
  Video = 1,
  HLS = 2
}

export enum MediaQueryType {
  Image = 'image',
  Video = 'video'
}

export enum TweetType {
  Tweet = 0,
  Retweet = 1,
  Comment = 2,
  QuoteTweet = 3
}

export enum TweetAudience {
  Everyone = 0,
  TwitterCircle = 1
}

export enum PeopleFollow {
  Anyone = '0',
  Following = '1'
}

export enum EncodingStatus {
  Pending = 0,
  Processing = 1,
  Success = 2,
  Failed = 3
}
