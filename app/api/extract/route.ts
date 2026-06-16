import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `Analiza este documento (factura o guía de despacho) y extrae los datos.
Responde SOLO con un JSON válido, sin backticks, sin texto extra:
{
  "proveedor": "nombre empresa emisora o null",
  "fecha": "DD/MM/YYYY o null",
  "valor": "monto total con moneda o null",
  "numero_documento": "número factura o guía o null",
  "tipo_documento": "Factura o Guía de Despacho",
  "orden_compra": "número OC o null",
  "ciudad": "ciudad origen o destino o null",
  "rut_proveedor": "RUT si aparece o null",
  "descripcion": "descripción breve del contenido o null"
}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const isPdf = file.type === "application/pdf";
    let mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";
    if (!isPdf && !["image/jpeg","image/png","image/gif","image/webp"].includes(mediaType)) {
      mediaType = "image/jpeg";
    }

    const contentBlock = isPdf
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
      : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType as "image/jpeg"|"image/png"|"image/gif"|"image/webp", data: base64 } };

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: PROMPT }] }],
    });

    const text = message.content.map(b => (b.type === "text" ? b.text : "")).join("").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: `Sin JSON en respuesta: ${text.slice(0, 200)}` }, { status: 500 });

    const data = JSON.parse(match[0]);
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error desconocido" }, { status: 500 });
  }
}

export const maxDuration = 30;
