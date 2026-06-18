import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `Analiza este documento (factura o guía de despacho) y extrae los datos.
Responde SOLO con un JSON válido, sin backticks, sin texto extra:
{
  "proveedor": "nombre o razón social de la empresa emisora o null",
  "rut_proveedor": "RUT del proveedor con formato XX.XXX.XXX-X o null",
  "fecha": "fecha del documento en formato DD/MM/YYYY o null",
  "tipo_documento": "Factura o Guía de Despacho",
  "numero_documento": "número de la factura o guía o null",
  "orden_compra": "número de orden de compra o null",
  "ciudad": "ciudad de origen o destino o null",
  "descripcion": "descripción detallada del contenido, productos o servicios o null",
  "valor_neto": "monto neto sin IVA, solo número sin símbolos ni puntos, o null",
  "iva": "monto del IVA, solo número sin símbolos ni puntos, o null",
  "total": "monto total con IVA incluido, solo número sin símbolos ni puntos, o null"
}`;

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (session.user.role === "viewer") {
      return NextResponse.json({ error: "Tu rol no permite subir documentos" }, { status: 403 });
    }

    const companyId = session.user.companyId;
    const userId = session.user.id;

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const isPdf = file.type === "application/pdf";
    let contentBlock: any;
    if (isPdf) {
      contentBlock = { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
    } else {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const mediaType = validTypes.includes(file.type) ? file.type : "image/jpeg";
      contentBlock = { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
    }

    const ext = file.name.split(".").pop() || (isPdf ? "pdf" : "jpg");
    const storagePath = `${companyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(storagePath, Buffer.from(bytes), { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: `Error subiendo archivo: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from("documents").getPublicUrl(storagePath);
    const fileUrl = urlData.publicUrl;

    let extracted: Record<string, string | null> = {};
    let status = "done";
    let errorMessage: string | null = null;

    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: PROMPT }] as any }],
      });

      const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error(`Respuesta inesperada: ${text.slice(0, 200)}`);
      extracted = JSON.parse(match[0]);
    } catch (err: any) {
      status = "error";
      errorMessage = err.message;
    }

    const { data: doc, error: dbError } = await supabaseAdmin
      .from("documents")
      .insert({
        company_id: companyId,
        uploaded_by: userId,
        file_name: file.name,
        file_url: fileUrl,
        proveedor: extracted.proveedor ?? null,
        rut_proveedor: extracted.rut_proveedor ?? null,
        fecha: extracted.fecha ?? null,
        tipo_documento: extracted.tipo_documento ?? null,
        numero_documento: extracted.numero_documento ?? null,
        orden_compra: extracted.orden_compra ?? null,
        ciudad: extracted.ciudad ?? null,
        descripcion: extracted.descripcion ?? null,
        valor_neto: extracted.valor_neto ?? null,
        iva: extracted.iva ?? null,
        total: extracted.total ?? null,
        status,
        error_message: errorMessage,
      })
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: `Error guardando en BD: ${dbError.message}` }, { status: 500 });

    if (status === "error") return NextResponse.json({ error: errorMessage, doc }, { status: 500 });

    return NextResponse.json({ data: doc });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
