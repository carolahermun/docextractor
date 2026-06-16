import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

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

    let contentBlock: any;

    if (isPdf) {
      contentBlock = {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      };
    } else {
      const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const mediaType = validImageTypes.includes(file.type) ? file.type : "image/jpeg";
      contentBlock = {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      };
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: PROMPT }] as any }],
    });

    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: `Respuesta inesperada: ${text.slice(0, 200)}` }, { status: 500 });

    const data = JSON.parse(match[0]);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
