# DocExtractor 📄

Extrae datos de facturas y guías de despacho con IA (Claude de Anthropic).  
Exporta a Excel o copia directo a Google Sheets.

---

## 🚀 Deploy en Vercel (5 pasos)

### 1. Obtén tu API Key de Anthropic
- Ve a https://console.anthropic.com/settings/keys
- Crea una nueva API Key y cópiala

### 2. Sube el proyecto a GitHub
- Crea un repositorio nuevo en https://github.com/new
- Sube estos archivos al repositorio

### 3. Conecta con Vercel
- Ve a https://vercel.com y crea cuenta gratuita
- Haz clic en "Add New Project"
- Importa tu repositorio de GitHub

### 4. Agrega la variable de entorno
En Vercel, antes de hacer deploy:
- Ve a "Environment Variables"
- Agrega: `ANTHROPIC_API_KEY` = tu key (sk-ant-...)

### 5. Deploy
- Haz clic en "Deploy"
- En 2 minutos tendrás tu URL pública (ej: docextractor.vercel.app)

---

## 💻 Desarrollo local

```bash
# 1. Instala dependencias
npm install

# 2. Crea el archivo de variables de entorno
cp .env.example .env.local
# Edita .env.local y agrega tu ANTHROPIC_API_KEY

# 3. Inicia el servidor
npm run dev

# 4. Abre http://localhost:3000
```

---

## 📁 Estructura del proyecto

```
docextractor/
├── app/
│   ├── api/extract/route.ts   ← Backend: recibe archivos, llama a Claude
│   ├── page.tsx               ← Frontend: interfaz principal
│   ├── layout.tsx
│   └── globals.css
├── package.json
├── next.config.js
├── tsconfig.json
└── .env.example               ← Copia como .env.local con tu API key
```

---

## 📱 App móvil

El endpoint `/api/extract` acepta cualquier archivo via `multipart/form-data`.  
Una app React Native o Flutter puede enviar fotos directamente a ese endpoint.

---

## 💰 Costo aproximado

- Claude Sonnet: ~$0.003 USD por documento
- 100 docs/semana ≈ $1.20 USD/mes
- Vercel: gratis para este uso

---

## 🔧 Personalización

Para agregar más campos, edita el `PROMPT` en `app/api/extract/route.ts`.
