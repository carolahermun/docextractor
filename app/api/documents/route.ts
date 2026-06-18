import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session: any = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("company_id", session.user.companyId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

export async function DELETE(req: Request) {
  const session: any = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role === "viewer") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await req.json();
  const { error } = await supabaseAdmin
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("company_id", session.user.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
