export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/availability/:path*",
    "/exams/:path*",
    "/assignments/:path*",
    "/convocations/:path*",
    "/admin/:path*"
  ]
};
