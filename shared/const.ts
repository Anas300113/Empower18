export const COOKIE_NAME = "webdev_app_session";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
export const NOT_STUDENT_ERR_MSG = "Student role required (10003)";

// Supabase Auth error messages
export const SUPABASE_EMAIL_REQUIRED_ERR = "Email is required";
export const SUPABASE_PASSWORD_REQUIRED_ERR = "Password is required";
export const SUPABASE_EMAIL_TAKEN_ERR =
  "An account with this email already exists";
export const SUPABASE_INVALID_CREDENTIALS_ERR = "Invalid email or password";
export const SUPABASE_EMAIL_NOT_VERIFIED_ERR =
  "Please verify your email before signing in";
export const SUPABASE_RESET_LINK_INVALID_ERR =
  "The password reset link is invalid or has expired";
export const SUPABASE_TOKEN_INVALID_ERR =
  "The verification link is invalid or has expired";
