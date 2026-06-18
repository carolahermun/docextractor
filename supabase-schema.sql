-- ════════════════════════════════════════════════════════════
-- DOCEXTRACTOR — ESQUEMA DE BASE DE DATOS MULTI-EMPRESA
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run
-- ════════════════════════════════════════════════════════════

-- 1. EMPRESAS (cada cliente de tu startup es una fila aquí)
create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

-- 2. USUARIOS (cada persona pertenece a una empresa)
create table app_users (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references companies(id) on delete cascade,
  email         text unique not null,
  password_hash text not null,
  name          text not null,
  role          text not null check (role in ('admin', 'editor', 'viewer')),
  created_at    timestamptz default now()
);

-- 3. DOCUMENTOS (cada factura/guía procesada, ligada a su empresa)
create table documents (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references companies(id) on delete cascade,
  uploaded_by       uuid references app_users(id),
  file_name         text not null,
  file_url          text not null,           -- link permanente en Supabase Storage
  proveedor         text,
  rut_proveedor     text,
  fecha             text,
  tipo_documento    text,
  numero_documento  text,
  orden_compra      text,
  ciudad            text,
  descripcion       text,
  valor_neto        text,
  iva               text,
  total             text,
  status            text default 'done',     -- done | error
  error_message     text,
  created_at        timestamptz default now()
);

-- Índices para que las búsquedas sean rápidas con miles de documentos
create index idx_documents_company on documents(company_id);
create index idx_documents_created on documents(created_at desc);
create index idx_users_email on app_users(email);

-- ════════════════════════════════════════════════════════════
-- DATOS DE PRUEBA — Crea tu primera empresa y usuario admin
-- (Cambia el email y nombre antes de ejecutar)
-- ════════════════════════════════════════════════════════════

insert into companies (name) values ('Mi Empresa Demo')
returning id;  -- 👈 copia el ID que aparece aquí, lo necesitas abajo

-- Reemplaza 'PEGA-AQUI-EL-ID' con el ID que copiaste arriba
-- La contraseña en este ejemplo es "admin123" (ya hasheada)
-- Más abajo te explico cómo generar el hash de la contraseña real
