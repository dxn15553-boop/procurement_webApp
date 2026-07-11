import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const mustChangePassword = (auth?.user as any)?.mustChangePassword;

      const isAuthPage = nextUrl.pathname.startsWith("/login");
      const isTeamRoute = nextUrl.pathname.startsWith("/team");
      const isManagerRoute = nextUrl.pathname.startsWith("/manager");
      const isChangePasswordRoute = nextUrl.pathname.startsWith("/change-password");

      if (isLoggedIn) {
        if (mustChangePassword && !isChangePasswordRoute) {
          return Response.redirect(new URL("/change-password", nextUrl));
        }
        if (!mustChangePassword && isChangePasswordRoute) {
          return Response.redirect(new URL(role === "MANAGER" ? "/manager" : "/team", nextUrl));
        }
      }

      if (isLoggedIn && isAuthPage) {
        if (role === "MANAGER") {
          return Response.redirect(new URL("/manager", nextUrl));
        }
        return Response.redirect(new URL("/team", nextUrl));
      }

      if (!isLoggedIn && (isTeamRoute || isManagerRoute || isChangePasswordRoute)) {
        return false; // Redirects to signIn page (login)
      }

      if (isLoggedIn && isManagerRoute && role !== "MANAGER") {
        return Response.redirect(new URL("/team", nextUrl));
      }

      if (isLoggedIn && isTeamRoute && role !== "TEAM") {
        return Response.redirect(new URL("/manager", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        token.mustChangePassword = (user as any).mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
  providers: [], // Overridden in auth.ts with database-dependent providers
} satisfies NextAuthConfig;
