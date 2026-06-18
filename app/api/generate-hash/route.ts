import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Genera un hash de contraseña 100% compatible con el login de la app.
// Protegido con una clave secreta para que no cualquiera pueda usarlo.
// Uso: /api/generate-hash?pw=LA_CONTRASEÑA&key=TU_NEXTAUTH_SECRET

export async function GET(req: NextRequest) {
  const pw = req.nextUrl.searchParams.get("pw");
  const key = req.nextUrl.searchParams.get("key");

  if (key !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!pw) {
    return NextResponse.json({ error: "Falta el parámetro pw" }, { status: 400 });
  }

  const hash = await bcrypt.hash(pw, 12);
  return NextResponse.json({ password: pw, hash });
}
