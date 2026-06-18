"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const T = {
  ink: "#1A1918", red: "#E24B4A", redDark: "#A32D2D",
  slate: "#F0F4F8", border: "#D9E2EC", muted: "#64748B",
  faint: "#94A3B8", danger: "#DC2626", white: "#FFFFFF",
};

function ExtractaMark({ size = 46 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, background: T.red, borderRadius: size * 0.22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 200 200">
        <path d="M70 90 C 70 78 86 70 100 78 L 152 110 C 166 118 166 126 152 134 L 100 166 C 86 174 70 166 70 154 C 70 144 76 136 84 132 L 117 110 L 84 88 C 76 84 70 76 70 90 Z" fill="#ffffff"/>
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.ok) router.push("/");
    else { setError("Email o contraseña incorrectos."); setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.slate, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>

      <svg width="420" height="420" viewBox="0 0 420 420" style={{ position: "absolute", top: "-80px", right: "-100px", opacity: 0.05 }}>
        <path d="M120 140 C 110 130 110 110 130 120 L 230 175 C 245 183 245 197 230 205 L 130 260 C 110 270 110 250 120 240 C 128 233 138 226 150 222 L 200 195 L 150 168 C 138 164 128 157 120 140 Z" fill={T.ink}/>
        <path d="M210 140 C 200 130 200 110 220 120 L 320 175 C 335 183 335 197 320 205 L 220 260 C 200 270 200 250 210 240 C 218 233 228 226 240 222 L 290 195 L 240 168 C 228 164 218 157 210 140 Z" fill={T.red}/>
      </svg>

      <div style={{ background: T.white, borderRadius: 18, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", padding: "44px 40px", width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 32 }}>
          <ExtractaMark size={46} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 22, color: T.ink, letterSpacing: "-0.4px" }}>Extracta</p>
            <p style={{ fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Extracción inteligente · IA</p>
          </div>
        </div>

        <p style={{ fontWeight: 700, fontSize: 18, color: T.ink, marginBottom: 4 }}>Iniciar sesión</p>
        <p style={{ fontSize: 13, color: T.muted, marginBottom: 28 }}>Ingresa con tu email y contraseña</p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@empresa.com" required
              style={{ width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 14, outline: "none", color: T.ink, fontFamily: "inherit" }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{ width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 14, outline: "none", color: T.ink, fontFamily: "inherit" }}
            />
          </div>

          {error && (
            <div style={{ background: "#FEF2F2", border: `1px solid ${T.danger}`, borderRadius: 8, padding: "10px 14px", marginBottom: 18, color: T.danger, fontSize: 13, fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{ width: "100%", background: loading ? T.faint : T.red, color: "#fff", border: "none", borderRadius: 9, padding: "13px", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s" }}
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
