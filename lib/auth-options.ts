import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email:    { label: "Email",      type: "email"    },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        console.log("=== AUTHORIZE START ===");
        console.log("Email recibido:", JSON.stringify(credentials?.email));

        if (!credentials?.email || !credentials?.password) {
          console.log("FALLO: faltan credenciales");
          return null;
        }

        const { data: user, error } = await supabaseAdmin
          .from("app_users")
          .select("id, email, name, role, password_hash, company_id, companies(name)")
          .eq("email", credentials.email)
          .single();

        console.log("Supabase error:", error ? JSON.stringify(error) : "ninguno");
        console.log("Usuario encontrado:", user ? `SI (${user.email})` : "NO");

        if (error || !user) {
          console.log("FALLO: no se encontró usuario o hubo error de Supabase");
          return null;
        }

        console.log("Hash en BD:", user.password_hash);
        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        console.log("Resultado bcrypt.compare:", valid);

        if (!valid) {
          console.log("FALLO: contraseña no coincide");
          return null;
        }

        console.log("=== AUTHORIZE SUCCESS ===");
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.company_id,
          companyName: (user as any).companies?.name ?? "",
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.companyName = (user as any).companyName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
        (session.user as any).companyName = token.companyName;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
