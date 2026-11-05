-- Pengunjung publik (anon) hanya boleh membaca; semua penulisan wajib login.
revoke insert, update, delete, truncate on all tables in schema public from anon;
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon;
