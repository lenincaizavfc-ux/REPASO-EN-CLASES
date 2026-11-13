-- ============================================================
-- 1) Crear la base de datos BAD_PROD
-- Ejecutar este archivo conectado a la base "postgres".
-- (En PostgreSQL los nombres sin comillas se guardan en minúsculas,
--  por eso la base se llama "bad_prod".)
-- Si la base ya existe, este comando da error y se puede ignorar.
-- ============================================================

CREATE DATABASE bad_prod
  WITH ENCODING 'UTF8'
       TEMPLATE template0;
