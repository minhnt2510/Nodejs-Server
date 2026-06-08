export const USERS_MESSAGES = {
  VALIDATION_ERROR: 'Validation error',
  NAME_IS_REQUIRED: 'Name is required',
  NAME_MUST_BE_A_STRING: 'Name must be a string',
  NAME_LENGTH_MUST_BE_FROM_1_TO_100: 'Name length must be from 1 to 100',

  EMAIL_ALREADY_EXISTS: 'Email already exists',
  EMAIL_IS_REQUIRED: 'Email is required',
  EMAIL_IS_INVALID: 'Email is invalid',

  EMAIL_OR_PASSWORD_IS_INCORRECT: 'Email or password is incorrect',

  PASSWORD_IS_REQUIRED: 'Password is required',
  PASSWORD_MUST_BE_A_STRING: 'Password must be a string',
  PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50: 'Password length must be from 6 to 50',
  PASSWORD_MUST_BE_STRONG:
    'Password must be 6-50 characters long and contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 symbol',

  CONFIRM_PASSWORD_IS_REQUIRED: 'Confirm password is required',
  CONFIRM_PASSWORD_MUST_BE_A_STRING: 'Confirm password must be a string',
  CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50: 'Confirm password length must be from 6 to 50',
  CONFIRM_PASSWORD_MUST_BE_STRONG:
    'Confirm password must be 6-50 characters long and contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 symbol',
  CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD: 'Confirm password must be the same as password',

  DATE_OF_BIRTH_MUST_BE_ISO8601: 'Date of birth must be ISO8601',

  REGISTER_SUCCESS: 'Register success',
  LOGIN_SUCCESS: 'Login success',
  LOGOUT_SUCCESS: 'Logout success',
  REFRESH_TOKEN_SUCCESS: 'Refresh token success',

  ACCESS_TOKEN_IS_REQUIRED: 'Access token is required',
  REFRESH_TOKEN_IS_REQUIRED: 'Refresh token is required',
  REFRESH_TOKEN_IS_INVALID: 'Refresh token is invalid',
  USED_REFRESH_TOKEN_OR_NOT_EXIST: 'Used refresh token or not exist',

  EMAIL_VERIFY_TOKEN_IS_REQUIRED: 'Email verify token is required',
  EMAIL_ALREADY_VERIFIED_BEFORE: 'Email already verified before',
  EMAIL_VERIFY_SUCCESS: 'Email verify success',
  RESEND_VERIFY_EMAIL_SUCCESS: 'Resend verify email success',

  USER_NOT_FOUND: 'User not found',
  USER_NOT_VERIFIED: 'User not verified',
  USER_BANNED: 'User banned',

  FORGOT_PASSWORD_IS_REQUIRED: 'Forgot password is required',
  CHECK_EMAIL_TO_RESET_PASSWORD: 'Check email to reset password',

  FORGOT_PASSWORD_TOKEN_IS_REQUIRED: 'Forgot password token is required',
  VERIFY_FORGOT_PASSWORD_SUCCESS: 'Verify forgot password success',
  INVALID_FORGOT_PASSWORD_TOKEN: 'Invalid forgot password token',

  RESET_PASSWORD_SUCCESS: 'Reset password success',

  GET_ME_SUCCESS: 'Get my profile success',
  UPDATE_ME_SUCCESS: 'Update my profile success',

  BIO_MUST_BE_A_STRING: 'Bio must be a string',
  BIO_LENGTH_MUST_BE_FROM_1_TO_200: 'Bio length must be from 1 to 200',
  LOCATION_MUST_BE_A_STRING: 'Location must be a string',
  LOCATION_LENGTH_MUST_BE_FROM_1_TO_200: 'Location length must be from 1 to 200',
  WEBSITE_MUST_BE_A_STRING: 'Website must be a string',
  WEBSITE_LENGTH_MUST_BE_FROM_1_TO_200: 'Website length must be from 1 to 200',
  USERNAME_MUST_BE_A_STRING: 'Username must be a string',
  USERNAME_INVALID:
    'Username must be 4-15 characters long and contain only letters, numbers, and underscores, not only numbers',
  USERNAME_EXISTED: 'Username already exists',
  IMAGE_URL_MUST_BE_A_STRING: 'Image url must be a string',
  IMAGE_URL_LENGTH_MUST_BE_FROM_1_TO_400: 'Image url length must be from 1 to 400',

  GET_PROFILE_SUCCESS: 'Get profile success',
  FOLLOW_SUCCESS: 'Follow success',
  ALREADY_FOLLOWED: 'Already followed',
  FOLLOWED_USER_ID_IS_REQUIRED: 'Followed user id is required',
  INVALID_USER_ID: 'Invalid user id',

  UNFOLLOW_SUCCESS: 'Unfollow success',
  ALREADY_UNFOLLOWED: 'Already unfollowed',

  OLD_PASSWORD_NOT_MATCH: 'Old password not match',
  CHANGE_PASSWORD_SUCCESS: 'Change password success',

  GMAIL_NOT_VERIFIED: 'Gmail not verified'
} as const

export const TWEETS_MESSAGES = {
  INVALID_TYPE: 'Invalid tweet type',
  INVALID_AUDIENCE: 'Invalid tweet audience',
  PARENT_ID_MUST_BE_A_VALID_TWEET_ID: 'Parent id must be a valid tweet id',
  PARENT_ID_MUST_BE_NULL: 'Parent id must be null',
  CONTENT_MUST_BE_A_NON_EMPTY_STRING: 'Content must be a non-empty string',
  CONTENT_MUST_BE_EMPTY_STRING: 'Content must be empty string',
  HASHTAGS_MUST_BE_AN_ARRAY_OF_STRING: 'Hashtags must be an array of string',
  MENTIONS_MUST_BE_AN_ARRAY_OF_USER_ID: 'Mentions must be an array of user id',
  MEDIAS_MUST_BE_AN_ARRAY_OF_MEDIA_OBJECT: 'Medias must be an array of media object',
  TWEET_NOT_FOUND: 'Tweet not found',
  TWEET_IS_NOT_PUBLIC: 'Tweet is not public',
  INVALID_TWEET_ID: 'Invalid tweet id',
  GET_TWEET_SUCCESS: 'Get tweet success',
  CREATE_TWEET_SUCCESS: 'Create tweet success',
  UPDATE_TWEET_SUCCESS: 'Update tweet success',
  DELETE_TWEET_SUCCESS: 'Delete tweet success',
  GET_TWEET_CHILDREN_SUCCESS: 'Get tweet children success',
  GET_NEW_FEEDS_SUCCESS: 'Get new feeds success',
  GET_USER_TWEETS_SUCCESS: 'Get user tweets success',
  TWEET_PERMISSION_DENIED: 'You do not have permission to modify this tweet',
  RETWEET_CANNOT_BE_UPDATED: 'Retweet cannot be updated'
} as const

export const BOOKMARKS_MESSAGES = {
  BOOKMARK_SUCCESSFULLY: 'Bookmark successfully',
  UNBOOKMARK_SUCCESSFULLY: 'Unbookmark successfully'
} as const

export const LIKES_MESSAGES = {
  LIKE_SUCCESSFULLY: 'Like successfully',
  UNLIKE_SUCCESSFULLY: 'Unlike successfully'
} as const

export const MEDIAS_MESSAGES = {
  UPLOAD_SUCCESS: 'Upload success',
  GET_VIDEO_STATUS_SUCCESS: 'Get video status success'
} as const

export const SEARCH_MESSAGES = {
  SEARCH_SUCCESS: 'Search success',
  CONTENT_MUST_BE_A_NON_EMPTY_STRING: 'Content must be a non-empty string',
  MEDIA_TYPE_MUST_BE_IMAGE_OR_VIDEO: 'Media type must be image or video',
  PEOPLE_FOLLOW_MUST_BE_0_OR_1: 'People follow must be 0 or 1'
} as const

export const CONVERSATIONS_MESSAGES = {
  GET_CONVERSATIONS_SUCCESS: 'Get conversations success'
} as const
