export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/availability/:path*",
    "/my-convocations/:path*",
    "/exams/:path*",
    "/assignments/:path*",
    "/convocations/:path*",
    "/admin/:path*"
  ]
};
