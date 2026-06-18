import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// ⚠️ ENDPOINT TEMPORAL DE DIAGNÓSTICO — borrar después de usar
export async function GET(req: NextRequest) {
  const pw = req.nextUrl.searchParams.get("pw") || "admin123";
  const hash = await bcrypt.hash(pw, 12);
  const checkAgainstOld = await bcrypt.compare(
    pw,
    "$2a$12$23IzRrcVFEIIEFTocUKhGOgDvFMNFdy8xBSMTuBrh5kFTnzXU6QLi"
  );
  return NextResponse.json({
    password_probada: pw,
    hash_nuevo_generado_por_la_app: hash,
    coincide_contra_hash_viejo: checkAgainstOld,
  });
}
