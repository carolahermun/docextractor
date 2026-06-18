export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/", "/api/extract", "/api/documents"],
};
