import "next-auth";
import "next-auth/jwt";

type AppRole = "TEACHER" | "MANAGER" | "ADMIN";

declare module "next-auth" {
  interface User {
    role: AppRole;
  }

  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: AppRole;
      active: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    active?: boolean;
  }
}
