# Extracta v2 — Multi-empresa con base de datos persistente

## 🆕 Qué cambió respecto a la v1

- ✅ Los documentos **ya no se borran** al recargar o cambiar de dispositivo
- ✅ Las fotos/PDFs se guardan **permanentemente** (Supabase Storage)
- ✅ Soporta **varias empresas** (multi-tenant), cada una aislada
- ✅ Login real con roles: `admin`, `editor`, `viewer`

---

## 🚀 Configuración paso a paso

### 1. Crear proyecto en Supabase

1. Ve a https://supabase.com → Sign up (con GitHub, igual que Vercel)
2. "New Project" → ponle un nombre (ej: "docextractor")
3. Elige una contraseña para la base de datos y guárdala
4. Espera ~2 minutos a que se cree el proyecto

### 2. Crear las tablas de la base de datos

1. En Supabase, ve al menú izquierdo → **SQL Editor**
2. Abre el archivo `supabase-schema.sql` de este proyecto
3. Copia y pega TODO el contenido en el SQL Editor
4. Haz clic en **Run**

### 3. Crear el bucket de almacenamiento (para las fotos/PDFs)

1. En Supabase, ve a **Storage** (menú izquierdo)
2. Clic en **New bucket**
3. Nombre: `documents`
4. Marca **Public bucket** (así los links del Excel funcionan)
5. **Create bucket**

### 4. Obtener tus claves de Supabase

1. Ve a **Settings** (ícono de engranaje) → **API**
2. Copia:
   - **Project URL** → la usarás como `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (en "Project API keys", la secreta) → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ La `service_role key` es muy poderosa — nunca la subas a un repositorio público ni la compartas.

### 5. Crear tu primera empresa y usuario admin

Necesitas generar una contraseña "hasheada" (encriptada) antes de crear el usuario. 

**Opción fácil — usa este sitio:** https://bcrypt-generator.com
1. Escribe la contraseña que quieras (ej: `admin123`)
2. Rounds: 10
3. Genera el hash
4. Copia el resultado (empieza con `$2a$` o `$2b$`)

Luego en Supabase → SQL Editor, ejecuta (reemplazando los valores):

```sql
-- 1. Crear la empresa
insert into companies (name) values ('Transportes Ejemplo SPA')
returning id;
-- 👆 copia el ID que te devuelve

-- 2. Crear el usuario admin (reemplaza el company_id con el ID de arriba)
insert into app_users (company_id, email, password_hash, name, role)
values (
  'PEGA-AQUI-EL-ID-DE-LA-EMPRESA',
  'admin@transportesejemplo.com',
  'PEGA-AQUI-EL-HASH-GENERADO',
  'Administrador',
  'admin'
);
```

Repite el paso 2 para cada chofer/usuario, cambiando el rol a `editor` (sube documentos) o `viewer` (solo visualiza).

### 6. Variables de entorno en Vercel

Agrega estas 4 variables en Vercel → Settings → Environment Variables:

| Nombre | De dónde sacarlo |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `NEXTAUTH_SECRET` | cualquier texto largo aleatorio |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |

### 7. Deploy

Sube los archivos a GitHub (reemplazando los anteriores) y Vercel hará el deploy automáticamente.

---

## 👥 Gestión de usuarios y empresas (por ahora, manual vía SQL)

Para agregar una nueva empresa cliente:
```sql
insert into companies (name) values ('Nombre Empresa Cliente 2') returning id;
```

Para agregar un chofer/usuario a esa empresa:
```sql
insert into app_users (company_id, email, password_hash, name, role)
values ('ID-EMPRESA', 'chofer1@empresa2.com', 'HASH-GENERADO', 'Juan Pérez', 'editor');
```

> 📌 Próximo paso natural: construir un panel de administración para hacer esto sin SQL — lo abordamos cuando tengas 2-3 empresas activas.

---

## 💰 Costos estimados (Fase piloto)

| Servicio | Plan | Costo |
|---|---|---|
| Supabase | Free tier (500MB DB, 1GB storage) | $0/mes |
| Vercel | Hobby | $0/mes |
| Claude API | ~5,000 docs/mes | ~$20-25 USD/mes |

Cuando superes los límites gratuitos (varias empresas, +5GB de fotos), Supabase Pro cuesta $25 USD/mes con límites mucho más altos.
