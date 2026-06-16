"use client";
import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

/* ── Types ── */
type DocStatus = "processing" | "done" | "error";
interface Doc {
  id: string;
  name: string;
  objectUrl: string;
  status: DocStatus;
  data: Record<string, string | null>;
  error: string;
}

/* ── Design tokens ── */
const T = {
  navy:    "#0D1F36",
  navyMid: "#1A3354",
  teal:    "#0F8B8D",
  tealLt:  "#14B8BA",
  slate:   "#F0F4F8",
  border:  "#D9E2EC",
  text:    "#1E293B",
  muted:   "#64748B",
  faint:   "#94A3B8",
  white:   "#FFFFFF",
  green:   "#16A34A",
  amber:   "#D97706",
  red:     "#DC2626",
};

/* ── Helpers ── */
async function extractDoc(file: File): Promise<Record<string, string | null>> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/extract", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || `Error ${res.status}`);
  return json.data;
}

/* ── Main component ── */
export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const processFile = useCallback(async (file: File) => {
    const id = crypto.randomUUID();
    const objectUrl = URL.createObjectURL(file);
    setDocs(prev => [...prev, { id, name: file.name, objectUrl, status: "processing", data: {}, error: "" }]);
    try {
      const data = await extractDoc(file);
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: "done", data } : d));
    } catch (err: any) {
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: "error", error: err.message } : d));
    }
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .filter(f => f.type === "application/pdf" || f.type.startsWith("image/"))
      .forEach(processFile);
  };

  const exportXLSX = () => {
    const done = docs.filter(d => d.status === "done");
    if (!done.length) return showToast("No hay documentos procesados aún.");
    const rows = done.map(d => ({
      Proveedor:         d.data.proveedor        ?? "",
      "RUT Proveedor":   d.data.rut_proveedor    ?? "",
      Fecha:             d.data.fecha            ?? "",
      Tipo:              d.data.tipo_documento   ?? "",
      "N° Documento":    d.data.numero_documento ?? "",
      "Orden de Compra": d.data.orden_compra     ?? "",
      Ciudad:            d.data.ciudad           ?? "",
      "Descripción":     d.data.descripcion      ?? "",
      "Valor Neto":      d.data.valor_neto       ?? "",
      IVA:               d.data.iva              ?? "",
      Total:             d.data.total            ?? "",
      Archivo:           d.name,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [26,16,12,14,16,18,14,45,14,12,14,30].map(w => ({ wch: w }));
    done.forEach((d, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: 11 });
      if (ws[cellRef]) ws[cellRef].l = { Target: d.objectUrl, Tooltip: d.name };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Documentos");
    XLSX.writeFile(wb, `documentos_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("✅ Excel descargado correctamente.");
  };

  const copySheets = () => {
    const done = docs.filter(d => d.status === "done");
    if (!done.length) return showToast("No hay documentos procesados aún.");
    const cols = ["Proveedor","RUT Proveedor","Fecha","Tipo","N° Documento","Orden de Compra","Ciudad","Descripción","Valor Neto","IVA","Total","Archivo"];
    const rows = done.map(d => [
      d.data.proveedor, d.data.rut_proveedor, d.data.fecha, d.data.tipo_documento,
      d.data.numero_documento, d.data.orden_compra, d.data.ciudad,
      d.data.descripcion, d.data.valor_neto, d.data.iva, d.data.total, d.name,
    ].map(v => v ?? "").join("\t"));
    navigator.clipboard.writeText([cols.join("\t"), ...rows].join("\n"))
      .then(() => showToast("✅ Copiado. Pega con Ctrl+V en Google Sheets."))
      .catch(() => showToast("❌ No se pudo copiar. Usa Chrome o Edge."));
  };

  const doneN = docs.filter(d => d.status === "done").length;
  const procN = docs.filter(d => d.status === "processing").length;
  const errN  = docs.filter(d => d.status === "error").length;

  return (
    <div style={{ minHeight: "100vh", background: T.slate }}>

      {/* ── Header ── */}
      <header style={{ background: T.navy, height: 62, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 16px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: T.teal, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📄</div>
          <div>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>DocExtractor</p>
            <p style={{ color: T.faint, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>Extracción inteligente · IA</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={exportXLSX} style={btnStyle(T.teal, "#fff")}>⬇ Exportar Excel</button>
          <button onClick={copySheets} style={btnStyle("transparent", T.tealLt, `1.5px solid ${T.teal}`)}>📊 Google Sheets</button>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Stats ── */}
        {docs.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
            {([["Total subidos", docs.length, T.navy], ["Procesados ✓", doneN, T.green], ["En proceso…", procN, T.amber], ["Con error", errN, T.red]] as const).map(([l,v,c]) => (
              <div key={l} style={{ background: T.white, borderRadius: 12, padding: "16px 20px", borderLeft: `4px solid ${c}`, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: c }}>{v}</p>
                <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{l}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Drop zone ── */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2.5px dashed ${dragging ? T.teal : T.border}`,
            borderRadius: 16,
            background: dragging ? "#e6fafa" : T.white,
            padding: "44px 24px",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: 28,
            transition: "all 0.18s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <p style={{ fontSize: 44, marginBottom: 10 }}>📂</p>
          <p style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 6 }}>Arrastra facturas o guías aquí</p>
          <p style={{ color: T.faint, fontSize: 13 }}>PDF · JPG · PNG · WEBP — varios archivos a la vez</p>
          <input ref={fileRef} type="file" multiple accept=".pdf,image/*" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div style={{ background: T.navyMid, color: "#fff", borderRadius: 10, padding: "12px 20px", marginBottom: 20, fontSize: 13, fontWeight: 500, animation: "fadeIn 0.2s ease" }}>
            {toast}
          </div>
        )}

        {/* ── Table ── */}
        {docs.length > 0 && (
          <div style={{ background: T.white, borderRadius: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>Documentos procesados <span style={{ color: T.faint, fontWeight: 400 }}>({docs.length})</span></p>
              <button onClick={() => setDocs([])} style={{ color: T.faint, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Limpiar todo</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.slate }}>
                    {["Estado","Archivo","Proveedor","RUT","Fecha","Tipo","N° Doc.","OC","Ciudad","Valor Neto","IVA","Total","Ver",""].map(h => (
                      <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 600, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, i) => (
                    <tr key={doc.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 ? T.slate : T.white, animation: "fadeIn 0.25s ease" }}>
                      <td style={td}>
                        {doc.status === "processing" && <span style={{ color: T.amber, fontWeight: 600, fontSize: 12 }}>⏳ Procesando…</span>}
                        {doc.status === "done"       && <span style={{ color: T.green, fontWeight: 600, fontSize: 12 }}>✅ Listo</span>}
                        {doc.status === "error"      && (
                          <div style={{ color: T.red, fontSize: 11 }}>
                            <p style={{ fontWeight: 700 }}>❌ Error</p>
                            <p style={{ marginTop: 3, maxWidth: 220, lineHeight: 1.4, wordBreak: "break-word" }}>{doc.error}</p>
                          </div>
                        )}
                      </td>
                      <td style={{ ...td, color: T.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.name}>{doc.name}</td>
                      <td style={{ ...td, fontWeight: 600, color: T.navy }}>{doc.data.proveedor ?? <Dash />}</td>
                      <td style={td}>{doc.data.rut_proveedor ?? <Dash />}</td>
                      <td style={td}>{doc.data.fecha ?? <Dash />}</td>
                      <td style={td}>
                        {doc.data.tipo_documento
                          ? <span style={{ background: doc.data.tipo_documento.includes("Factura") ? "#EFF6FF" : "#F0FDF4", color: doc.data.tipo_documento.includes("Factura") ? "#1D4ED8" : "#15803D", padding: "3px 10px", borderRadius: 20, fontWeight: 600, fontSize: 11 }}>{doc.data.tipo_documento}</span>
                          : <Dash />}
                      </td>
                      <td style={td}>{doc.data.numero_documento ?? <Dash />}</td>
                      <td style={td}>{doc.data.orden_compra ?? <Dash />}</td>
                      <td style={td}>{doc.data.ciudad ?? <Dash />}</td>
                      <td style={{ ...td, fontWeight: 700, color: T.teal }}>{doc.data.valor_neto ? `$${Number(doc.data.valor_neto).toLocaleString("es-CL")}` : <Dash />}</td>
                      <td style={td}>{doc.data.iva ? `$${Number(doc.data.iva).toLocaleString("es-CL")}` : <Dash />}</td>
                      <td style={{ ...td, fontWeight: 700, color: T.teal }}>{doc.data.total ? `$${Number(doc.data.total).toLocaleString("es-CL")}` : <Dash />}</td>
                      <td style={td}>
                        <a href={doc.objectUrl} target="_blank" rel="noreferrer" style={{ color: T.teal, textDecoration: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>🔍 Ver</a>
                      </td>
                      <td style={td}>
                        <button onClick={() => setDocs(prev => prev.filter(d => d.id !== doc.id))} style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, fontSize: 16, lineHeight: 1 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {docs.length === 0 && (
          <div style={{ textAlign: "center", padding: "72px 0", color: T.faint }}>
            <p style={{ fontSize: 58, marginBottom: 14 }}>🗂️</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: T.muted }}>Sin documentos aún</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Arrastra archivos o haz clic arriba para comenzar</p>
          </div>
        )}

        {/* ── Info cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 32 }}>
          {[
            { icon: "🤖", t: "Extracción con IA", d: "Claude analiza cada documento y extrae proveedor, fecha, valor, N° doc, OC, ciudad, RUT y descripción — sin importar el formato." },
            { icon: "📊", t: "Excel & Google Sheets", d: "Exporta como .xlsx descargable o copia los datos con un clic para pegar directamente en Google Sheets." },
            { icon: "📱", t: "App móvil disponible", d: "Con este mismo backend puedes conectar una app iOS/Android donde tu equipo fotografía documentos en terreno." },
          ].map(c => (
            <div key={c.t} style={{ background: T.white, borderRadius: 12, padding: "22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</p>
              <p style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 6 }}>{c.t}</p>
              <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.65 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ── Micro components ── */
const Dash = () => <span style={{ color: "#CBD5E1" }}>—</span>;

/* ── Style helpers ── */
const td: React.CSSProperties = { padding: "12px 14px", verticalAlign: "top" };

function btnStyle(bg: string, color: string, border?: string): React.CSSProperties {
  return { background: bg, color, border: border ?? "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "opacity 0.15s" };
}
