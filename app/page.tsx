"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

interface Doc {
  id: string;
  file_name: string;
  file_url: string;
  status: string;
  error_message: string | null;
  proveedor: string | null;
  rut_proveedor: string | null;
  fecha: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  orden_compra: string | null;
  ciudad: string | null;
  descripcion: string | null;
  valor_neto: string | null;
  iva: string | null;
  total: string | null;
  created_at: string;
}

const T = {
  navy: "#1A1918", navyMid: "#2A2826", teal: "#E24B4A", tealLt: "#F09595",
  slate: "#F0F4F8", border: "#D9E2EC", muted: "#64748B", faint: "#94A3B8",
  white: "#FFFFFF", green: "#16A34A", amber: "#D97706", red: "#DC2626",
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const json = await res.json();
      if (json.documents) setDocs(json.documents);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") loadDocs();
  }, [status, loadDocs]);

  if (status === "loading" || status === "unauthenticated") {
    return <div style={{ minHeight: "100vh", background: T.slate, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>Cargando…</div>;
  }

  const role = (session?.user as any)?.role ?? "viewer";
  const isEditor = role === "editor" || role === "admin";
  const userName = session?.user?.name ?? "";
  const companyName = (session?.user as any)?.companyName ?? "";

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const processFile = async (file: File) => {
    setUploadingCount(c => c + 1);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        showToast(`❌ ${file.name}: ${json.error}`);
      } else {
        showToast(`✅ ${file.name} procesado correctamente.`);
        await loadDocs();
      }
    } catch (err: any) {
      showToast(`❌ Error de red: ${err.message}`);
    } finally {
      setUploadingCount(c => c - 1);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || !isEditor) return;
    Array.from(files)
      .filter(f => f.type === "application/pdf" || f.type.startsWith("image/"))
      .forEach(processFile);
  };

  const deleteDoc = async (id: string) => {
    await fetch("/api/documents", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  const exportXLSX = () => {
    const done = docs.filter(d => d.status === "done");
    if (!done.length) return showToast("No hay documentos procesados aún.");
    const rows = done.map(d => ({
      Proveedor: d.proveedor ?? "", "RUT Proveedor": d.rut_proveedor ?? "", Fecha: d.fecha ?? "",
      Tipo: d.tipo_documento ?? "", "N° Documento": d.numero_documento ?? "", "Orden de Compra": d.orden_compra ?? "",
      Ciudad: d.ciudad ?? "", Descripción: d.descripcion ?? "", "Valor Neto": d.valor_neto ?? "",
      IVA: d.iva ?? "", Total: d.total ?? "", Archivo: d.file_name,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [26,16,12,14,16,18,14,45,14,12,14,30].map(w => ({ wch: w }));
    done.forEach((d, i) => {
      const ref = XLSX.utils.encode_cell({ r: i + 1, c: 11 });
      if (ws[ref]) ws[ref].l = { Target: d.file_url, Tooltip: d.file_name };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Documentos");
    XLSX.writeFile(wb, `documentos_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("✅ Excel descargado.");
  };

  const copySheets = () => {
    const done = docs.filter(d => d.status === "done");
    if (!done.length) return showToast("No hay documentos procesados aún.");
    const cols = ["Proveedor","RUT Proveedor","Fecha","Tipo","N° Documento","Orden de Compra","Ciudad","Descripción","Valor Neto","IVA","Total","Archivo"];
    const rows = done.map(d => [d.proveedor,d.rut_proveedor,d.fecha,d.tipo_documento,d.numero_documento,d.orden_compra,d.ciudad,d.descripcion,d.valor_neto,d.iva,d.total,d.file_name].map(v=>v??"").join("\t"));
    navigator.clipboard.writeText([cols.join("\t"), ...rows].join("\n"))
      .then(() => showToast("✅ Copiado. Pega con Ctrl+V en Google Sheets."))
      .catch(() => showToast("❌ No se pudo copiar."));
  };

  const doneN = docs.filter(d => d.status === "done").length;
  const errN  = docs.filter(d => d.status === "error").length;

  return (
    <div style={{ minHeight: "100vh", background: T.slate }}>
      <header style={{ background: T.navy, height: 62, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 16px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: T.teal, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 200 200">
              <path d="M70 90 C 70 78 86 70 100 78 L 152 110 C 166 118 166 126 152 134 L 100 166 C 86 174 70 166 70 154 C 70 144 76 136 84 132 L 117 110 L 84 88 C 76 84 70 76 70 90 Z" fill="#ffffff"/>
            </svg>
          </div>
          <div>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>Extracta</p>
            <p style={{ color: T.faint, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{companyName || "Extracción inteligente · IA"}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={exportXLSX} style={btnStyle(T.teal, "#fff")}>⬇ Exportar Excel</button>
          <button onClick={copySheets} style={btnStyle("transparent", T.tealLt, `1.5px solid ${T.teal}`)}>📊 Google Sheets</button>
          <div style={{ width: 1, height: 28, background: "#ffffff22", margin: "0 4px" }} />
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{userName}</p>
            <p style={{ color: T.faint, fontSize: 10, textTransform: "uppercase" }}>{role}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ background: "none", border: "1px solid #ffffff33", borderRadius: 7, color: T.faint, fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>Salir</button>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
          {([["Total", docs.length, T.navy], ["Procesados ✓", doneN, T.green], ["Subiendo…", uploadingCount, T.amber], ["Con error", errN, T.red]] as const).map(([l,v,c]) => (
            <div key={l} style={{ background: T.white, borderRadius: 12, padding: "16px 20px", borderLeft: `4px solid ${c}`, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: c }}>{v}</p>
              <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{l}</p>
            </div>
          ))}
        </div>

        {isEditor && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2.5px dashed ${dragging ? T.teal : T.border}`, borderRadius: 16, background: dragging ? "#e6fafa" : T.white, padding: "44px 24px", textAlign: "center", cursor: "pointer", marginBottom: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
          >
            <p style={{ fontSize: 44, marginBottom: 10 }}>📂</p>
            <p style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 6 }}>Arrastra facturas o guías aquí</p>
            <p style={{ color: T.faint, fontSize: 13 }}>PDF · JPG · PNG · WEBP — los datos se guardan permanentemente</p>
            <input ref={fileRef} type="file" multiple accept=".pdf,image/*" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
          </div>
        )}

        {toast && <div style={{ background: T.navyMid, color: "#fff", borderRadius: 10, padding: "12px 20px", marginBottom: 20, fontSize: 13, fontWeight: 500 }}>{toast}</div>}

        {loadingDocs && <p style={{ textAlign: "center", color: T.faint, padding: 40 }}>Cargando documentos…</p>}

        {!loadingDocs && docs.length > 0 && (
          <div style={{ background: T.white, borderRadius: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between" }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>Documentos <span style={{ color: T.faint, fontWeight: 400 }}>({docs.length})</span></p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.slate }}>
                    {["Estado","Archivo","Proveedor","RUT","Fecha","Tipo","N° Doc.","OC","Ciudad","Valor Neto","IVA","Total","Ver",""].map(h => (
                      <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 600, fontSize: 10, color: T.muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, i) => (
                    <tr key={doc.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 ? T.slate : T.white }}>
                      <td style={td}>
                        {doc.status === "done" ? <span style={{ color: T.green, fontWeight: 600, fontSize: 12 }}>✅ Listo</span> : <span style={{ color: T.red, fontWeight: 600, fontSize: 11 }}>❌ {doc.error_message?.slice(0,40)}</span>}
                      </td>
                      <td style={{ ...td, color: T.muted, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.file_name}>{doc.file_name}</td>
                      <td style={{ ...td, fontWeight: 600, color: T.navy }}>{doc.proveedor ?? <Dash/>}</td>
                      <td style={td}>{doc.rut_proveedor ?? <Dash/>}</td>
                      <td style={td}>{doc.fecha ?? <Dash/>}</td>
                      <td style={td}>{doc.tipo_documento ? <span style={{ background: doc.tipo_documento.includes("Factura")?"#EFF6FF":"#F0FDF4", color: doc.tipo_documento.includes("Factura")?"#1D4ED8":"#15803D", padding:"3px 10px", borderRadius:20, fontWeight:600, fontSize:11 }}>{doc.tipo_documento}</span> : <Dash/>}</td>
                      <td style={td}>{doc.numero_documento ?? <Dash/>}</td>
                      <td style={td}>{doc.orden_compra ?? <Dash/>}</td>
                      <td style={td}>{doc.ciudad ?? <Dash/>}</td>
                      <td style={{ ...td, fontWeight: 700, color: T.teal }}>{doc.valor_neto ? `$${Number(doc.valor_neto).toLocaleString("es-CL")}` : <Dash/>}</td>
                      <td style={td}>{doc.iva ? `$${Number(doc.iva).toLocaleString("es-CL")}` : <Dash/>}</td>
                      <td style={{ ...td, fontWeight: 700, color: T.teal }}>{doc.total ? `$${Number(doc.total).toLocaleString("es-CL")}` : <Dash/>}</td>
                      <td style={td}><a href={doc.file_url} target="_blank" rel="noreferrer" style={{ color: T.teal, textDecoration: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontWeight: 600, fontSize: 11 }}>🔍 Ver</a></td>
                      <td style={td}>{isEditor && <button onClick={() => deleteDoc(doc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, fontSize: 16 }}>✕</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loadingDocs && docs.length === 0 && (
          <div style={{ textAlign: "center", padding: "72px 0", color: T.faint }}>
            <p style={{ fontSize: 58, marginBottom: 14 }}>🗂️</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: T.muted }}>Sin documentos aún</p>
          </div>
        )}
      </main>
    </div>
  );
}

const Dash = () => <span style={{ color: "#CBD5E1" }}>—</span>;
const td: React.CSSProperties = { padding: "12px 14px", verticalAlign: "top" };
function btnStyle(bg: string, color: string, border?: string): React.CSSProperties {
  return { background: bg, color, border: border ?? "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" };
}
