// Cookie names shared by the BFF route handlers and src/proxy.ts.
// Both cookies are httpOnly: tokens never reach browser JavaScript.
export const ACCESS_COOKIE = "ims_at"
export const REFRESH_COOKIE = "ims_rt"
