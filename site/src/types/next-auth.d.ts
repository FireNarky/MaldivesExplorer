import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      staff: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    sessionToken?: string;
    staff?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionToken?: string;
  }
}
