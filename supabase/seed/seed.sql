-- =====================================================================
-- BASECAMP PEMUDA RW 05 — Seed data realistis
-- Pemuda RW 05 Kwarasan, Nogotirto, Gamping, Sleman, DIY
-- Tanggal dibuat relatif terhadap current_date agar demo selalu "hidup".
-- Akun demo dibuat terpisah lewat: npm run seed:users
-- =====================================================================

do $seed$
declare
  v_org uuid := '0b05a5e0-0000-4000-8000-000000000005';
  d date := current_date;
  m0 date := date_trunc('month', current_date)::date;
  v_tunai uuid; v_bri uuid;
  c record;
  cat jsonb := '{}'::jsonb;
  icat jsonb := '{}'::jsonb;
  mem jsonb := '{}'::jsonb;
  ev jsonb := '{}'::jsonb;
  v_id uuid;
  v_item uuid;
  v_acc uuid;
  i integer;
  k integer;
  v_names text[];
  v_nick text[];
  v_roles text[];
  v_bal numeric;
  v_tunai_bal numeric;
  v_borrow uuid;
  v_units uuid[];
  v_member_ids uuid[];
  r record;
begin
  -- -------------------------------------------------------------------
  -- ORGANISASI
  -- -------------------------------------------------------------------
  insert into public.organizations (id, name, slug, short_name, location, tagline, about, settings)
  values (v_org, 'Pemuda RW 05 Kwarasan', 'pemuda-rw05-kwarasan', 'Pemuda RW 05',
    'Kwarasan, Nogotirto, Gamping, Sleman, Daerah Istimewa Yogyakarta',
    'Bangun Kegiatan. Kelola Kas. Gerakkan Pemuda.',
    'Kami anak-anak muda Kwarasan yang tumbuh bareng di gang yang sama, main di lapangan yang sama, dan sekarang gantian jadi yang ngurusin kampung. Dari kerja bakti Minggu pagi, turnamen futsal, sampai Gebyar Kemerdekaan tiap tahun — semuanya dikerjakan bareng-bareng, pakai tenaga, ide, dan kas yang dikelola terbuka.',
    jsonb_build_object('strict_balance', false, 'public_inventory_summary', true))
  on conflict (id) do nothing;

  -- -------------------------------------------------------------------
  -- ANGGOTA (47 aktif + 5 nonaktif)
  -- -------------------------------------------------------------------
  v_names := array[
    'Muhammad Rizky Pratama','Dimas Aji Saputra','Nadia Putri Rahmawati','Anisa Wulandari','Budi Santoso',
    'Fajar Nugroho','Laras Setyaningsih','Galih Prasetyo','Yoga Pamungkas','Sekar Ayu Lestari',
    'Arif Wibowo','Bagas Setiawan','Candra Kusuma','Dewi Kartika Sari','Eko Purnomo','Fitri Handayani',
    'Gilang Ramadhan','Hana Pertiwi','Ilham Maulana','Jati Wicaksono','Kurnia Sari','Lintang Kinasih',
    'Mahendra Adi Nugroho','Nurul Hidayah','Oki Setiawan','Putri Ayuningtyas','Rahmat Hidayat','Rina Marlina',
    'Satria Wijaya','Tri Wahyuni','Umar Faruq','Vina Anggraini','Wahyu Hidayat','Yusuf Aditya','Zahra Salsabila',
    'Adi Nugraha','Bayu Kurniawan','Citra Dewi Anggraeni','Danang Suryo','Erlangga Putra','Faiz Ramadhan',
    'Gita Permatasari','Hendra Wijaya','Intan Purnamasari','Joko Susilo','Krisna Mukti','Larasati Wulan',
    'Rudi Hartono','Sinta Maharani','Taufik Hidayat','Wulan Sari','Agus Prabowo'];
  v_nick := array['Rizky','Dimas','Nadia','Anis','Budi','Fajar','Laras','Galih','Yoga','Sekar',
    'Arif','Bagas','Candra','Dewi','Eko','Fitri','Gilang','Hana','Ilham','Jati','Kurnia','Lintang',
    'Hendro','Nurul','Oki','Putri','Rahmat','Rina','Satria','Tri','Umar','Vina','Wahyu','Yusuf','Zahra',
    'Adi','Bayu','Citra','Danang','Angga','Faiz','Gita','Hendra','Intan','Joko','Krisna','Wulan',
    'Rudi','Sinta','Taufik','Wulan S','Agus'];
  v_roles := array['KETUA','WAKIL','SEKRETARIS','BENDAHARA','KOORDINATOR','KOORDINATOR','KOORDINATOR','KOORDINATOR','KOORDINATOR','KOORDINATOR'];

  for i in 1..array_length(v_names, 1) loop
    insert into public.members (organization_id, name, nickname, join_date, role, status, bio)
    values (v_org, v_names[i], v_nick[i],
      (d - ((i * 97) % 1400 + 120))::date,
      coalesce(v_roles[i], 'ANGGOTA')::public.member_role,
      case when i > 47 then 'INACTIVE' else 'ACTIVE' end::public.member_status,
      case i
        when 1 then 'Ketua Pemuda RW 05 periode 2025–2027. Suka ngopi sambil nyusun rundown.'
        when 2 then 'Wakil ketua, penghubung pemuda dengan pengurus RW dan karang taruna padukuhan.'
        when 3 then 'Sekretaris. Notulen rapat, surat undangan, dan arsip ada di tangan Nadia.'
        when 4 then 'Bendahara. Semua nota dan kuitansi wajib lewat meja Anis.'
        when 5 then 'Koordinator perlengkapan & inventaris. Hafal letak setiap tenda dan kabel roll.'
        when 6 then 'Koordinator olahraga. Penggerak turnamen futsal dan jalan sehat.'
        when 7 then 'Koordinator humas & dokumentasi. Kamera selalu siap di tas.'
        when 8 then 'Koordinator acara. Ketua panitia Gebyar Kemerdekaan 2026.'
        when 9 then 'Koordinator lingkungan. Penggagas bank sampah dan tanam pohon.'
        when 10 then 'Koordinator sosial. Mengurus bakti sosial dan donor darah.'
        else null end)
    returning id into v_id;
    v_member_ids := array_append(v_member_ids, v_id);
    insert into public.member_private (member_id, organization_id, phone, address)
    values (v_id, v_org,
      '08' || (case i % 4 when 0 then '12' when 1 then '57' when 2 then '81' else '95' end)
        || lpad(((i * 7919 + 1234567) % 100000000)::text, 8, '0'),
      'Kwarasan RT 0' || (i % 6 + 1) || '/RW 05, Nogotirto, Gamping, Sleman');
  end loop;
  -- nama panggilan -> id
  for i in 1..array_length(v_names, 1) loop
    mem := mem || jsonb_build_object(v_nick[i], v_member_ids[i]);
  end loop;

  -- -------------------------------------------------------------------
  -- KEUANGAN: akun & kategori
  -- -------------------------------------------------------------------
  insert into public.finance_accounts (organization_id, name, type, description)
  values (v_org, 'Kas Tunai', 'CASH', 'Uang tunai yang dipegang bendahara untuk kebutuhan harian.')
  returning id into v_tunai;
  insert into public.finance_accounts (organization_id, name, type, description)
  values (v_org, 'Rekening BRI Pemuda RW 05', 'BANK', 'Rekening bersama pemuda untuk donasi, sponsor, dan simpanan kas.')
  returning id into v_bri;

  for c in select * from (values
    ('Iuran Anggota','INCOME','#3E9B4F'), ('Donasi Warga','INCOME','#4BA3D9'), ('Sponsor Event','INCOME','#F2B632'),
    ('Pendapatan Kegiatan','INCOME','#7BC47F'), ('Saldo Awal Periode','INCOME','#8B5E3C'),
    ('Konsumsi','EXPENSE','#E07A5F'), ('Dekorasi','EXPENSE','#C77DFF'), ('Hadiah','EXPENSE','#F2B632'),
    ('Sound System','EXPENSE','#4BA3D9'), ('Transportasi','EXPENSE','#8B5E3C'), ('Perlengkapan','EXPENSE','#3E9B4F'),
    ('Operasional','EXPENSE','#6B7280')
  ) as t(name, type, color) loop
    insert into public.finance_categories (organization_id, name, type, color)
    values (v_org, c.name, c.type::public.category_type, c.color) returning id into v_id;
    cat := cat || jsonb_build_object(c.name, v_id);
  end loop;

  -- -------------------------------------------------------------------
  -- EVENT & KEGIATAN
  -- -------------------------------------------------------------------
  for r in select * from (values
    ('gebyar','Gebyar Kemerdekaan 2026','gebyar-kemerdekaan-2026','EVENT','PLANNING', 12, 0, 16, 23, 10000000, 400, null::int, true, 'Lapangan RW 05 Kwarasan',
      'Malam puncak peringatan HUT ke-81 Republik Indonesia untuk warga Kwarasan: lomba antar-RT, panggung seni anak muda, doorprize, dan tumpengan bareng. Tahun ini digelar setelah rangkaian lomba anak bulan Agustus selesai.'),
    ('futsal','Turnamen Futsal Pemuda RW 05','turnamen-futsal-pemuda-2026','EVENT','PLANNING', 26, 1, 8, 17, 3500000, 16, null, true, 'GOR Mini Nogotirto',
      'Turnamen futsal antar-RT dan undangan pemuda se-Nogotirto. 16 tim, sistem gugur, final di hari kedua.'),
    ('baksos','Bakti Sosial Pemuda RW 05','bakti-sosial-2026','EVENT','PLANNING', 40, 0, 8, 12, 2500000, 60, null, true, 'Balai RW 05 Kwarasan',
      'Pembagian sembako untuk lansia dan keluarga prasejahtera, cek kesehatan gratis bersama puskesmas, dan bazar baju layak pakai.'),
    ('makrab','Malam Keakraban Pemuda','malam-keakraban-pemuda-2026','EVENT','COMPLETED', -60, 1, 16, 10, 1800000, 45, 41, true, 'Bumi Perkemahan Kaliurang',
      'Dua hari satu malam untuk mengenal anggota baru, evaluasi program, dan api unggun bareng.'),
    ('jalansehat','Jalan Sehat Syawalan','jalan-sehat-syawalan-2026','EVENT','COMPLETED', -170, 0, 6, 11, 4000000, 300, 356, true, 'Start–Finish Lapangan RW 05',
      'Jalan sehat keliling Kwarasan setelah Lebaran, lanjut halal bihalal dan undian doorprize.'),
    ('lombaanak','Lomba Anak Tujuhbelasan','lomba-anak-tujuhbelasan-2026','EVENT','COMPLETED', -40, 0, 7, 13, 2000000, 80, 94, true, 'Lapangan RW 05 Kwarasan',
      'Balap karung, makan kerupuk, estafet kelereng, dan tarik tambang untuk anak-anak Kwarasan.'),
    ('donor','Donor Darah Bareng PMI Sleman','donor-darah-2026','EVENT','COMPLETED', -100, 0, 8, 12, 1200000, 50, 47, true, 'Balai RW 05 Kwarasan',
      'Kegiatan donor darah rutin bekerja sama dengan PMI Kabupaten Sleman.'),
    ('kerjabakti','Kerja Bakti Lingkungan','kerja-bakti-lingkungan-oktober','KEGIATAN','READY', 3, 0, 6, 10, 250000, 40, null, true, 'Sepanjang Jalan Kwarasan & selokan barat',
      'Bersih-bersih selokan, pangkas ranting, dan cat ulang gapura menjelang musim hujan.'),
    ('rapat','Rapat Pemuda RW 05','rapat-pemuda-persiapan-gebyar','KEGIATAN','READY', 5, 0, 19, 22, 0, 30, null, true, 'Sekretariat Pemuda RW 05',
      'Rapat koordinasi terakhir persiapan Gebyar Kemerdekaan: cek quest checklist, kebutuhan inventaris, dan anggaran.'),
    ('selokan','Kerja Bakti Bersih Selokan','kerja-bakti-bersih-selokan','KEGIATAN','COMPLETED', -20, 0, 6, 10, 150000, 35, 38, true, 'Selokan Mataram sisi Kwarasan',
      'Gotong royong membersihkan sampah selokan bersama warga.'),
    ('pleno','Rapat Pleno Triwulan III','rapat-pleno-triwulan-3','KEGIATAN','COMPLETED', -35, 0, 19, 22, 0, 30, 27, false, 'Sekretariat Pemuda RW 05',
      'Evaluasi program triwulan dan laporan kas pemuda.'),
    ('ramadan','Kerja Bakti Menjelang Ramadan','kerja-bakti-ramadan-2026','KEGIATAN','COMPLETED', -210, 0, 6, 10, 200000, 40, 44, true, 'Masjid & Mushola Kwarasan',
      'Bersih-bersih masjid dan mushola menyambut Ramadan.'),
    ('bukber','Buka Bersama Pemuda','buka-bersama-pemuda-2026','KEGIATAN','COMPLETED', -190, 0, 16, 20, 900000, 50, 52, true, 'Sekretariat Pemuda RW 05',
      'Buka puasa bersama anggota dan santunan anak yatim.'),
    ('canva','Pelatihan Desain Canva untuk UMKM','pelatihan-canva-umkm','KEGIATAN','COMPLETED', -130, 0, 9, 12, 300000, 25, 22, true, 'Balai RW 05 Kwarasan',
      'Pemuda mengajari pelaku UMKM Kwarasan membuat poster promosi dan katalog digital.'),
    ('tanampohon','Tanam Pohon & Bank Sampah','tanam-pohon-bank-sampah','KEGIATAN','COMPLETED', -80, 0, 7, 11, 450000, 40, 36, true, 'Bantaran Sungai Kwarasan',
      'Menanam 60 bibit pohon dan peluncuran bank sampah pemuda.'),
    ('bentukpanitia','Rapat Pembentukan Panitia Gebyar','rapat-pembentukan-panitia-gebyar','KEGIATAN','COMPLETED', -50, 0, 19, 22, 0, 30, 33, false, 'Sekretariat Pemuda RW 05',
      'Membentuk panitia Gebyar Kemerdekaan 2026 dan membagi seksi.'),
    ('ronda','Ronda & Siskamling Pemuda','ronda-siskamling-pemuda','KEGIATAN','COMPLETED', -15, 0, 22, 23, 100000, 20, 18, false, 'Pos Ronda RT 02',
      'Jadwal ronda gabungan pemuda setelah ada laporan pencurian helm.'),
    ('nobar','Nonton Bareng Timnas','nonton-bareng-timnas','KEGIATAN','COMPLETED', -8, 0, 19, 22, 250000, 60, 75, true, 'Sekretariat Pemuda RW 05',
      'Nobar pertandingan Timnas di layar proyektor sekretariat.'),
    ('friendly','Futsal Persahabatan vs Pemuda RW 07','futsal-persahabatan-rw07','EVENT','CANCELLED', -25, 0, 16, 18, 300000, 2, null, false, 'GOR Mini Nogotirto',
      'Dibatalkan karena lapangan dipakai kegiatan desa.'),
    ('pensi','Pentas Seni Akhir Tahun','pentas-seni-akhir-tahun','EVENT','DRAFT', 80, 0, 18, 23, 5000000, 250, null, false, 'Lapangan RW 05 Kwarasan',
      'Draf konsep pentas seni pemuda di akhir tahun.')
  ) as t(key, name, slug, kind, status, day_offset, span_days, start_hour, end_hour, budget, target, actual, is_public, location, description)
  loop
    insert into public.events (organization_id, name, slug, kind, description, location, start_date, end_date, status,
      budget, target_participant, actual_participant, is_public)
    values (v_org, r.name, r.slug, r.kind::public.event_kind, r.description, r.location,
      ((d + r.day_offset)::timestamp + make_interval(hours => r.start_hour)) at time zone 'Asia/Jakarta',
      ((d + r.day_offset + r.span_days)::timestamp + make_interval(hours => r.end_hour)) at time zone 'Asia/Jakarta',
      r.status::public.event_status, r.budget, r.target, r.actual, r.is_public)
    returning id into v_id;
    ev := ev || jsonb_build_object(r.key, v_id);
  end loop;

  -- Panitia Gebyar
  for r in select * from (values
    ('Galih','Ketua Panitia','Inti'), ('Nadia','Sekretaris Panitia','Inti'), ('Anis','Bendahara Panitia','Inti'),
    ('Fajar','Koordinator Lomba','Acara'), ('Sekar','Koordinator Konsumsi','Konsumsi'), ('Budi','Koordinator Perlengkapan','Perlengkapan'),
    ('Laras','Humas & Dokumentasi','Humas'), ('Yoga','Keamanan & Parkir','Keamanan'), ('Bagas','Anggota Seksi Perlengkapan','Perlengkapan'),
    ('Putri','Anggota Seksi Acara','Acara'), ('Ilham','Anggota Seksi Keamanan','Keamanan'), ('Gita','Anggota Seksi Konsumsi','Konsumsi')
  ) as t(nick, role, division) loop
    insert into public.event_members (organization_id, event_id, member_id, committee_role, division)
    values (v_org, (ev->>'gebyar')::uuid, (mem->>r.nick)::uuid, r.role, r.division);
  end loop;
  -- Panitia Futsal & Baksos
  for r in select * from (values
    ('futsal','Fajar','Ketua Panitia','Inti'), ('futsal','Gilang','Koordinator Pertandingan','Pertandingan'),
    ('futsal','Satria','Wasit & Jadwal','Pertandingan'), ('futsal','Anis','Bendahara','Inti'), ('futsal','Laras','Dokumentasi','Humas'),
    ('baksos','Sekar','Ketua Panitia','Inti'), ('baksos','Nurul','Pendataan Penerima','Sosial'), ('baksos','Hana','Logistik Sembako','Logistik'),
    ('kerjabakti','Yoga','Koordinator Lapangan','Inti'), ('rapat','Rizky','Pimpinan Rapat','Inti'), ('rapat','Nadia','Notulen','Inti'),
    ('makrab','Dimas','Ketua Panitia','Inti'), ('jalansehat','Fajar','Ketua Panitia','Inti'), ('lombaanak','Putri','Ketua Panitia','Inti'),
    ('donor','Sekar','Ketua Panitia','Inti')
  ) as t(ev, nick, role, division) loop
    insert into public.event_members (organization_id, event_id, member_id, committee_role, division)
    values (v_org, (ev->>r.ev)::uuid, (mem->>r.nick)::uuid, r.role, r.division);
  end loop;

  -- Quest checklist Gebyar (13/18 selesai = 72%)
  i := 0;
  for r in select * from (values
    ('Tentukan lokasi & tanggal', true, 'Rizky'), ('Bentuk panitia', true, 'Rizky'), ('Susun konsep acara & rundown', true, 'Galih'),
    ('Buat proposal sponsor', true, 'Nadia'), ('Cari sponsor UMKM & donatur', true, 'Anis'), ('Izin kegiatan ke RW & padukuhan', true, 'Dimas'),
    ('Rekap pendaftaran lomba antar-RT', true, 'Fajar'), ('Booking sound system & panggung', true, 'Budi'), ('Desain poster & banner', true, 'Laras'),
    ('Cek kondisi tenda & kursi di gudang', true, 'Budi'), ('Belanja dekorasi merah putih', true, 'Putri'), ('Latihan pengisi acara pentas', true, 'Galih'),
    ('Atur jadwal keamanan & parkir', true, 'Yoga'), ('Siapkan hadiah & doorprize', false, 'Anis'), ('Pesan konsumsi & tumpeng', false, 'Sekar'),
    ('Publikasikan acara ke grup warga', false, 'Laras'), ('Pasang tenda & instalasi listrik H-1', false, 'Bagas'), ('Gladi bersih', false, 'Galih')
  ) as t(title, done, nick) loop
    i := i + 1;
    insert into public.event_tasks (organization_id, event_id, title, assignee_member_id, due_date, is_done, sort_order)
    values (v_org, (ev->>'gebyar')::uuid, r.title, (mem->>r.nick)::uuid, d + least(i - 8, 11), r.done, i);
  end loop;

  -- Quest event lain
  for r in select * from (values
    ('futsal','Booking GOR 2 hari',true), ('futsal','Buka pendaftaran tim',true), ('futsal','Cetak bagan pertandingan',true),
    ('futsal','Siapkan trofi & medali',true), ('futsal','Konfirmasi wasit',true), ('futsal','Technical meeting kapten tim',false),
    ('futsal','Siapkan P3K & air minum',false), ('futsal','Publikasi jadwal pertandingan',false),
    ('baksos','Pendataan penerima sembako',true), ('baksos','Koordinasi dengan puskesmas',true), ('baksos','Belanja sembako',false),
    ('baksos','Kumpulkan baju layak pakai',false), ('baksos','Siapkan meja registrasi',false), ('baksos','Kupon pengambilan sembako',false),
    ('kerjabakti','Umumkan di grup warga',true), ('kerjabakti','Pinjam cangkul & sapu lidi',true), ('kerjabakti','Beli cat gapura',true), ('kerjabakti','Siapkan konsumsi ringan',false),
    ('rapat','Kirim undangan rapat',true), ('rapat','Siapkan laporan progres seksi',true), ('rapat','Siapkan proyektor',false)
  ) as t(ev, title, done) loop
    insert into public.event_tasks (organization_id, event_id, title, is_done, sort_order)
    values (v_org, (ev->>r.ev)::uuid, r.title, r.done, 0);
  end loop;
  for r in select key from jsonb_each(ev) where key in ('makrab','jalansehat','lombaanak','donor','selokan','pleno','ramadan','bukber','canva','tanampohon','bentukpanitia','ronda','nobar') loop
    for k in 1..(case when r.key in ('makrab','jalansehat','lombaanak','donor') then 6 else 3 end) loop
      insert into public.event_tasks (organization_id, event_id, title, is_done, sort_order)
      values (v_org, (ev->>r.key)::uuid,
        (array['Rapat persiapan','Bagi tugas seksi','Siapkan perlengkapan','Publikasi ke warga','Konsumsi','Laporan & dokumentasi'])[k], true, k);
    end loop;
  end loop;

  -- Jadwal Gebyar & Futsal
  for r in select * from (values
    ('gebyar', 0, 15, 0, 17, 30, 'Final lomba antar-RT (tarik tambang & bakiak)', 'Lapangan RW 05', 'Fajar'),
    ('gebyar', 0, 18, 30, 19, 0, 'Registrasi warga & pembagian kupon doorprize', 'Meja registrasi', 'Putri'),
    ('gebyar', 0, 19, 0, 19, 30, 'Pembukaan, sambutan Ketua RW & doa bersama', 'Panggung utama', 'Galih'),
    ('gebyar', 0, 19, 30, 21, 0, 'Pentas seni pemuda & anak-anak', 'Panggung utama', 'Galih'),
    ('gebyar', 0, 21, 0, 22, 0, 'Potong tumpeng & pembagian hadiah lomba', 'Panggung utama', 'Anis'),
    ('gebyar', 0, 22, 0, 23, 0, 'Undian doorprize & penutupan', 'Panggung utama', 'Galih'),
    ('futsal', 0, 8, 0, 12, 0, 'Babak penyisihan grup A–D', 'GOR Mini Nogotirto', 'Gilang'),
    ('futsal', 0, 13, 0, 17, 0, 'Babak perempat final', 'GOR Mini Nogotirto', 'Gilang'),
    ('futsal', 1, 8, 0, 12, 0, 'Semifinal & perebutan juara 3', 'GOR Mini Nogotirto', 'Satria'),
    ('futsal', 1, 15, 0, 17, 0, 'Final & penyerahan trofi', 'GOR Mini Nogotirto', 'Fajar')
  ) as t(ev, dayoff, sh, sm, eh, em, title, loc, pic) loop
    insert into public.event_schedules (organization_id, event_id, title, start_at, end_at, location, pic)
    select v_org, e.id, r.title,
      (((e.start_date at time zone 'Asia/Jakarta')::date + r.dayoff)::timestamp + make_interval(hours => r.sh, mins => r.sm)) at time zone 'Asia/Jakarta',
      (((e.start_date at time zone 'Asia/Jakarta')::date + r.dayoff)::timestamp + make_interval(hours => r.eh, mins => r.em)) at time zone 'Asia/Jakarta',
      r.loc, (select name from public.members where id = (mem->>r.pic)::uuid)
    from public.events e where e.id = (ev->>r.ev)::uuid;
  end loop;

  -- -------------------------------------------------------------------
  -- TRANSAKSI KAS (akun non-event)
  -- -------------------------------------------------------------------
  -- Iuran bulanan & operasional 11 bulan ke belakang
  for k in 1..11 loop
    insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description, account_id, payment_method, is_approved, is_public)
    values (v_org, (m0 - make_interval(months => k))::date + 4, 'INCOME', (cat->>'Iuran Anggota')::uuid, 470000,
      'Iuran anggota bulan ' || to_char((m0 - make_interval(months => k))::date, 'MM/YYYY') || ' (47 anggota × Rp10.000)', v_tunai, 'CASH', true, true);
    insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description, account_id, payment_method, is_approved, is_public)
    values (v_org, (m0 - make_interval(months => k))::date + 20, 'EXPENSE', (cat->>'Operasional')::uuid, 90000 + (k % 4) * 20000,
      'Listrik, air galon, dan ATK sekretariat', v_tunai, 'CASH', true, k % 3 = 0);
    if k % 2 = 0 then
      insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description, account_id, payment_method, is_approved, is_public)
      values (v_org, (m0 - make_interval(months => k))::date + 12, 'INCOME', (cat->>'Pendapatan Kegiatan')::uuid, 150000 + (k % 3) * 75000,
        'Sewa tenda & kursi untuk hajatan warga', v_tunai, 'CASH', true, true);
    end if;
    if k % 3 = 1 then
      insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description, account_id, payment_method, is_approved, is_public)
      values (v_org, (m0 - make_interval(months => k))::date + 15, 'INCOME', (cat->>'Donasi Warga')::uuid, 250000 + k * 25000,
        'Donasi warga untuk kas pemuda', v_bri, 'TRANSFER', true, true);
    end if;
  end loop;
  insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description, account_id, payment_method, is_approved, is_public)
  values
    (v_org, d - 150, 'EXPENSE', (cat->>'Perlengkapan')::uuid, 1250000, 'Beli 2 tenda kecil dan 10 kursi plastik baru', v_bri, 'TRANSFER', true, true),
    (v_org, d - 95, 'EXPENSE', (cat->>'Perlengkapan')::uuid, 480000, 'Servis sound system & ganti kabel mic', v_bri, 'TRANSFER', true, true),
    (v_org, d - 70, 'EXPENSE', (cat->>'Transportasi')::uuid, 200000, 'Sewa pikap angkut tenda ke Kaliurang', v_tunai, 'CASH', true, false);

  -- Bulan berjalan: pemasukan Rp2.100.000, pengeluaran Rp1.350.000
  insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description, account_id, payment_method, is_approved, is_public)
  values
    (v_org, least(d, m0 + 4), 'INCOME', (cat->>'Iuran Anggota')::uuid, 470000, 'Iuran anggota bulan ' || to_char(m0, 'MM/YYYY') || ' (47 anggota × Rp10.000)', v_tunai, 'CASH', true, true),
    (v_org, least(d, m0 + 9), 'INCOME', (cat->>'Donasi Warga')::uuid, 1000000, 'Donasi Bapak-Ibu warga RT 01–06 untuk kegiatan pemuda', v_bri, 'TRANSFER', true, true),
    (v_org, least(d, m0 + 13), 'INCOME', (cat->>'Pendapatan Kegiatan')::uuid, 630000, 'Sewa tenda besar, 60 kursi, dan sound untuk hajatan', v_tunai, 'CASH', true, true),
    (v_org, least(d, m0 + 6), 'EXPENSE', (cat->>'Operasional')::uuid, 150000, 'Listrik & air sekretariat', v_tunai, 'CASH', true, false),
    (v_org, least(d, m0 + 11), 'EXPENSE', (cat->>'Perlengkapan')::uuid, 850000, 'Beli 6 lampu LED sorot & 2 kabel roll 20 m', v_bri, 'TRANSFER', true, true),
    (v_org, least(d, m0 + 16), 'EXPENSE', (cat->>'Transportasi')::uuid, 350000, 'Sewa pikap ambil panggung & sound Gebyar', v_tunai, 'CASH', true, true);

  -- -------------------------------------------------------------------
  -- TRANSAKSI EVENT (akun terpisah per event)
  -- -------------------------------------------------------------------
  for r in select * from (values
    -- ev, offset hari dari hari ini, tipe, kategori, nominal, deskripsi, publik
    ('gebyar', -45, 'TRANSFER', null, 3000000, 'Alokasi kas pemuda untuk Gebyar Kemerdekaan', true),
    ('gebyar', -30, 'INCOME', 'Sponsor Event', 3000000, 'Sponsor UMKM & toko bangunan sekitar Kwarasan', true),
    ('gebyar', -22, 'INCOME', 'Donasi Warga', 1000000, 'Donasi warga untuk malam puncak', true),
    ('gebyar', -14, 'EXPENSE', 'Hadiah', 2000000, 'Hadiah lomba antar-RT & doorprize utama', true),
    ('gebyar', -9, 'EXPENSE', 'Konsumsi', 1500000, 'DP konsumsi tumpeng & snack panitia', true),
    ('gebyar', -6, 'EXPENSE', 'Dekorasi', 750000, 'Umbul-umbul, bendera, dan backdrop panggung', true),
    ('gebyar', -3, 'EXPENSE', 'Sound System', 2000000, 'Sewa panggung, lighting, dan sound system', true),
    ('futsal', -28, 'TRANSFER', null, 1500000, 'Alokasi kas untuk Turnamen Futsal', true),
    ('futsal', -20, 'INCOME', 'Pendapatan Kegiatan', 800000, 'Biaya pendaftaran 16 tim × Rp50.000', true),
    ('futsal', -18, 'INCOME', 'Sponsor Event', 1000000, 'Sponsor kedai kopi & distro lokal', true),
    ('futsal', -15, 'EXPENSE', 'Operasional', 1200000, 'DP sewa GOR 2 hari', true),
    ('futsal', -12, 'EXPENSE', 'Hadiah', 1000000, 'Trofi juara 1–3 dan medali', true),
    ('futsal', -7, 'EXPENSE', 'Konsumsi', 420000, 'Air mineral & konsumsi wasit', true),
    ('futsal', -4, 'EXPENSE', 'Transportasi', 250000, 'Transport wasit', false),
    ('baksos', -10, 'TRANSFER', null, 500000, 'Alokasi kas untuk Bakti Sosial', true),
    ('baksos', -8, 'INCOME', 'Donasi Warga', 1200000, 'Donasi sembako dari warga dan alumni pemuda', true),
    ('baksos', -2, 'EXPENSE', 'Perlengkapan', 300000, 'Kantong sembako & kupon', true),
    ('makrab', -75, 'TRANSFER', null, 1200000, 'Alokasi kas untuk Makrab', true),
    ('makrab', -70, 'INCOME', 'Pendapatan Kegiatan', 600000, 'Iuran peserta makrab', true),
    ('makrab', -61, 'EXPENSE', 'Konsumsi', 1100000, 'Konsumsi 2 hari', true),
    ('makrab', -61, 'EXPENSE', 'Operasional', 600000, 'Sewa area bumi perkemahan', true),
    ('jalansehat', -190, 'TRANSFER', null, 500000, 'Alokasi kas untuk Jalan Sehat', true),
    ('jalansehat', -185, 'INCOME', 'Sponsor Event', 2500000, 'Sponsor doorprize dari UMKM Nogotirto', true),
    ('jalansehat', -180, 'INCOME', 'Donasi Warga', 1000000, 'Donasi warga', true),
    ('jalansehat', -171, 'EXPENSE', 'Hadiah', 2200000, 'Doorprize sepeda, kipas angin, dan voucher', true),
    ('jalansehat', -171, 'EXPENSE', 'Konsumsi', 900000, 'Snack & air mineral peserta', true),
    ('jalansehat', -171, 'EXPENSE', 'Sound System', 600000, 'Sewa sound & MC', true),
    ('jalansehat', -171, 'EXPENSE', 'Dekorasi', 250000, 'Banner start–finish', true),
    ('lombaanak', -55, 'TRANSFER', null, 1500000, 'Alokasi kas untuk Lomba Anak', true),
    ('lombaanak', -50, 'INCOME', 'Donasi Warga', 500000, 'Donasi hadiah lomba dari warga', true),
    ('lombaanak', -41, 'EXPENSE', 'Hadiah', 1200000, 'Hadiah lomba anak (alat tulis & snack)', true),
    ('lombaanak', -40, 'EXPENSE', 'Konsumsi', 450000, 'Es teh & snack peserta', true),
    ('lombaanak', -40, 'EXPENSE', 'Dekorasi', 300000, 'Bendera plastik & tali rafia', true),
    ('donor', -110, 'TRANSFER', null, 400000, 'Alokasi kas untuk Donor Darah', true),
    ('donor', -100, 'EXPENSE', 'Konsumsi', 350000, 'Snack & susu pendonor', true)
  ) as t(ev, dayoff, type, category, amount, description, is_public) loop
    select id into v_acc from public.finance_accounts where event_id = (ev->>r.ev)::uuid;
    if r.type = 'TRANSFER' then
      insert into public.finance_transactions (organization_id, transaction_date, type, amount, description, account_id, to_account_id, payment_method, is_approved, is_public)
      values (v_org, d + r.dayoff, 'TRANSFER', r.amount, r.description, v_bri, v_acc, 'TRANSFER', true, r.is_public);
    else
      insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description, account_id, payment_method, is_approved, is_public)
      values (v_org, d + r.dayoff, r.type::public.finance_type, (cat->>r.category)::uuid, r.amount, r.description, v_acc,
        case when r.type = 'INCOME' then 'TRANSFER' else 'CASH' end::public.payment_method, true, r.is_public);
    end if;
  end loop;

  -- Sisa dana event selesai dikembalikan ke kas
  for r in select * from (values ('makrab', -55), ('jalansehat', -165), ('lombaanak', -35), ('donor', -95)) as t(ev, dayoff) loop
    select account_id, balance into v_acc, v_bal from public.finance_account_balances where event_id = (ev->>r.ev)::uuid;
    if v_bal > 0 then
      insert into public.finance_transactions (organization_id, transaction_date, type, amount, description, account_id, to_account_id, payment_method, is_approved, is_public)
      values (v_org, d + r.dayoff, 'TRANSFER', v_bal, 'Pengembalian sisa dana event ke kas', v_acc, v_bri, 'TRANSFER', true, true);
    end if;
  end loop;

  -- Pengajuan panitia yang belum disetujui
  select id into v_acc from public.finance_accounts where event_id = (ev->>'gebyar')::uuid;
  insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description, account_id, payment_method, is_approved, is_public)
  values (v_org, d - 1, 'EXPENSE', (cat->>'Dekorasi')::uuid, 350000, 'Cetak banner & spanduk Gebyar (menunggu persetujuan bendahara)', v_acc, 'CASH', false, false);

  -- Saldo awal: Kas Tunai Rp1.250.000, total kas Rp8.250.000
  v_tunai_bal := public.account_balance(v_tunai);
  if v_tunai_bal > 1250000 then
    insert into public.finance_transactions (organization_id, transaction_date, type, amount, description, account_id, to_account_id, payment_method, is_approved, is_public)
    values (v_org, least(d, m0 + 17), 'TRANSFER', v_tunai_bal - 1250000, 'Setor kelebihan kas tunai ke rekening BRI', v_tunai, v_bri, 'TRANSFER', true, false);
  elsif v_tunai_bal < 1250000 then
    insert into public.finance_transactions (organization_id, transaction_date, type, amount, description, account_id, to_account_id, payment_method, is_approved, is_public)
    values (v_org, (m0 - interval '11 months')::date + 1, 'TRANSFER', 1250000 - v_tunai_bal, 'Tarik tunai untuk kas harian bendahara', v_bri, v_tunai, 'TRANSFER', true, false);
  end if;
  v_bal := public.account_balance(v_tunai) + public.account_balance(v_bri);
  insert into public.finance_transactions (organization_id, transaction_date, type, category_id, amount, description, account_id, payment_method, is_approved, is_public)
  values (v_org, (m0 - interval '11 months')::date, 'INCOME', (cat->>'Saldo Awal Periode')::uuid, 8250000 - v_bal,
    'Saldo awal periode kepengurusan (serah terima pengurus lama)', v_bri, 'TRANSFER', true, true);

  update public.organizations set settings = settings || jsonb_build_object('strict_balance', true) where id = v_org;

  -- -------------------------------------------------------------------
  -- INVENTARIS (128 unit)
  -- -------------------------------------------------------------------
  for c in select * from (values
    ('Tenda & Terpal','tent'), ('Furnitur','armchair'), ('Peralatan Makan','utensils'),
    ('Elektronik & Audio','speaker'), ('Kelistrikan & Lampu','lamp'), ('Perlengkapan Event','flag')
  ) as t(name, icon) loop
    insert into public.inventory_categories (organization_id, name, icon) values (v_org, c.name, c.icon) returning id into v_id;
    icat := icat || jsonb_build_object(c.name, v_id);
  end loop;

  for r in select * from (values
    ('INV-001','TND','Tenda Besar','Tenda & Terpal','unit',4,'Tenda dome 6×12 m untuk hajatan dan acara besar.',3500000,'Gudang Sekretariat',-900),
    ('INV-002','TDK','Tenda Kecil','Tenda & Terpal','unit',6,'Tenda 3×3 m untuk stand, registrasi, dan pos.',950000,'Gudang Sekretariat',-150),
    ('INV-003','KRS','Kursi Plastik','Furnitur','unit',50,'Kursi plastik merah tanpa sandaran lengan.',65000,'Gudang Sekretariat',-500),
    ('INV-004','MJL','Meja Lipat','Furnitur','unit',12,'Meja lipat 120×60 cm untuk konsumsi dan registrasi.',450000,'Gudang Sekretariat',-600),
    ('INV-005','GLS','Gelas','Peralatan Makan','lusin',5,'Gelas kaca bening, satu set = 1 lusin.',60000,'Lemari Dapur Balai RW',-700),
    ('INV-006','PRG','Piring','Peralatan Makan','lusin',5,'Piring melamin putih, satu set = 1 lusin.',90000,'Lemari Dapur Balai RW',-700),
    ('INV-007','SDK','Sendok','Peralatan Makan','lusin',4,'Sendok makan stainless, satu set = 1 lusin.',35000,'Lemari Dapur Balai RW',-700),
    ('INV-008','SND','Sound System','Elektronik & Audio','set',2,'Speaker aktif 15" + mixer 8 channel + 2 mic wireless.',6500000,'Sekretariat (rak elektronik)',-800),
    ('INV-009','PRY','Proyektor','Elektronik & Audio','unit',1,'Proyektor 3500 lumen + layar tripod 70".',4200000,'Sekretariat (rak elektronik)',-400),
    ('INV-010','KBL','Kabel Roll','Kelistrikan & Lampu','unit',8,'Kabel roll 20–50 m dengan 4 stopkontak.',185000,'Gudang Sekretariat',-300),
    ('INV-011','LMP','Lampu','Kelistrikan & Lampu','unit',16,'Lampu LED sorot 50 W dan lampu bohlam gantung.',120000,'Gudang Sekretariat',-200),
    ('INV-012','TRP','Terpal','Tenda & Terpal','lembar',8,'Terpal biru 4×6 m untuk alas dan atap darurat.',150000,'Gudang Sekretariat',-500),
    ('INV-013','HTK','Handy Talky','Elektronik & Audio','unit',4,'HT untuk koordinasi panitia dan keamanan.',350000,'Sekretariat (rak elektronik)',-350),
    ('INV-014','KMP','Kompor Gas','Perlengkapan Event','unit',3,'Kompor gas 1 tungku untuk dapur umum.',275000,'Lemari Dapur Balai RW',-650)
  ) as t(code, prefix, name, category, label, qty, description, price, location, bought)
  loop
    insert into public.inventory_items (organization_id, asset_code, unit_prefix, name, category_id, description, unit_label,
      purchase_date, purchase_price, location)
    values (v_org, r.code, r.prefix, r.name, (icat->>r.category)::uuid, r.description, r.label, d + r.bought, r.price, r.location)
    returning id into v_item;
    for k in 1..r.qty loop
      insert into public.inventory_units (organization_id, inventory_item_id, unit_code, condition, status)
      values (v_org, v_item, r.prefix || '-' || lpad(k::text, 3, '0'),
        (case when (k * 7 + length(r.name)) % 9 = 0 then 'EXCELLENT' when (k * 5 + length(r.name)) % 11 = 0 then 'FAIR' else 'GOOD' end)::public.item_condition,
        'AVAILABLE');
    end loop;
  end loop;

  -- Unit sedang maintenance
  update public.inventory_units set condition = 'DAMAGED', notes = 'Kaki kursi retak' where organization_id = v_org and unit_code in ('KRS-017', 'KRS-042');
  update public.inventory_units set condition = 'FAIR', status = 'MAINTENANCE', notes = 'Mic wireless kadang putus' where organization_id = v_org and unit_code = 'SND-002';
  insert into public.inventory_maintenance (organization_id, inventory_unit_id, issue, status, cost, started_at)
  select v_org, id, notes, case when unit_code = 'SND-002' then 'IN_PROGRESS' else 'OPEN' end::public.maintenance_status,
         case when unit_code = 'SND-002' then 150000 end, now() - interval '5 days'
    from public.inventory_units where organization_id = v_org and unit_code in ('KRS-017','KRS-042','SND-002');
  insert into public.inventory_maintenance (organization_id, inventory_unit_id, issue, status, cost, started_at, completed_at, result_condition, notes)
  select v_org, id, 'Resleting pintu tenda macet', 'DONE', 75000, now() - interval '40 days', now() - interval '33 days', 'GOOD', 'Resleting diganti baru'
    from public.inventory_units where organization_id = v_org and unit_code = 'TND-002';

  -- -------------------------------------------------------------------
  -- PEMINJAMAN
  -- -------------------------------------------------------------------
  -- Riwayat 16 peminjaman selesai
  for k in 1..16 loop
    insert into public.borrowings (organization_id, borrowing_code, borrower_name, borrower_phone, purpose, event_id,
      borrow_date, expected_return_date, actual_return_date, status, approved_at, created_at)
    values (v_org, 'PJM-' || to_char(d - (k * 14 + 5), 'YYMM') || '-' || lpad(k::text, 3, '0'),
      (array['Pak Suharno (RT 03)','Bu Sri Lestari (RT 01)','Takmir Masjid Al-Ikhlas','Pak Wagiman (RT 05)','Karang Taruna Padukuhan',
             'Bu Tini (RT 02)','PKK RW 05','Pak Bambang (RT 04)'])[(k % 8) + 1],
      '0812' || lpad((k * 34567)::text, 8, '0'),
      (array['Hajatan pernikahan','Pengajian rutin','Syukuran rumah baru','Rapat PKK','Kegiatan posyandu','Arisan RT','Lomba anak','Tahlilan'])[(k % 8) + 1],
      case k when 3 then (ev->>'lombaanak')::uuid when 7 then (ev->>'makrab')::uuid when 12 then (ev->>'jalansehat')::uuid else null end,
      d - (k * 14 + 5), d - (k * 14 + 3), d - (k * 14 + 3), 'RETURNED', now() - make_interval(days => k * 14 + 6),
      now() - make_interval(days => k * 14 + 6))
    returning id into v_borrow;
    insert into public.borrowing_items (organization_id, borrowing_id, inventory_unit_id, condition_before, condition_after, returned_at)
    select v_org, v_borrow, u.id, u.condition, u.condition, now() - make_interval(days => k * 14 + 3)
      from public.inventory_units u
     where u.organization_id = v_org and u.status = 'AVAILABLE'
       and u.unit_code = any(array[
         (array['TND','TDK','MJL','SND'])[(k % 4) + 1] || '-' || lpad(((k % 2) + 1)::text, 3, '0'),
         'KRS-' || lpad(((k * 3) % 40 + 1)::text, 3, '0'),
         'KRS-' || lpad(((k * 3) % 40 + 2)::text, 3, '0'),
         'KBL-' || lpad(((k % 8) + 1)::text, 3, '0')]);
  end loop;
  perform set_config('app.via_borrowing', 'on', true);
  perform public.next_org_counter(v_org, 'borrowing') from generate_series(1, 16);

  -- Sedang dipinjam: jatuh tempo besok (TND-004)
  insert into public.borrowings (organization_id, borrowing_code, borrower_name, borrower_phone, purpose,
    borrow_date, expected_return_date, status, approved_at, notes)
  values (v_org, 'PJM-' || to_char(d - 2, 'YYMM') || '-' || lpad(public.next_org_counter(v_org, 'borrowing')::text, 3, '0'),
    'Pak Suharno (RT 03)', '081234567812', 'Hajatan pernikahan putri Pak Suharno', d - 2, d + 1, 'BORROWED', now() - interval '3 days',
    'Diantar pakai pikap, dipasang oleh Bagas & Ilham.')
  returning id into v_borrow;
  select array_agg(id) into v_units from public.inventory_units
   where organization_id = v_org and unit_code in ('TND-004','MJL-005','MJL-006',
     'KRS-021','KRS-022','KRS-023','KRS-024','KRS-025','KRS-026','KRS-027','KRS-028','KRS-029','KRS-030');
  insert into public.borrowing_items (organization_id, borrowing_id, inventory_unit_id, condition_before)
  select v_org, v_borrow, u.id, u.condition from public.inventory_units u where u.id = any(v_units);
  perform set_config('app.unit_action', 'Dipinjam (hajatan Pak Suharno)', true);
  update public.inventory_units set status = 'BORROWED' where id = any(v_units);

  -- Dipinjam untuk kerja bakti (masih jalan)
  insert into public.borrowings (organization_id, borrowing_code, borrower_name, purpose, event_id,
    borrow_date, expected_return_date, status, approved_at, borrower_member_id)
  values (v_org, 'PJM-' || to_char(d, 'YYMM') || '-' || lpad(public.next_org_counter(v_org, 'borrowing')::text, 3, '0'),
    'Yoga Pamungkas', 'Persiapan Kerja Bakti Lingkungan', (ev->>'kerjabakti')::uuid, d - 1, d + 4, 'BORROWED', now() - interval '1 day',
    (mem->>'Yoga')::uuid)
  returning id into v_borrow;
  select array_agg(id) into v_units from public.inventory_units where organization_id = v_org and unit_code in ('TRP-001','TRP-002','KBL-003');
  insert into public.borrowing_items (organization_id, borrowing_id, inventory_unit_id, condition_before)
  select v_org, v_borrow, u.id, u.condition from public.inventory_units u where u.id = any(v_units);
  perform set_config('app.unit_action', 'Dipinjam (kerja bakti)', true);
  update public.inventory_units set status = 'BORROWED' where id = any(v_units);
  perform set_config('app.via_borrowing', '', true);
  perform set_config('app.unit_action', '', true);

  -- Pengajuan menunggu persetujuan (Gebyar)
  insert into public.borrowings (organization_id, borrowing_code, borrower_name, purpose, event_id,
    borrow_date, expected_return_date, status, borrower_member_id)
  values (v_org, 'PJM-' || to_char(d + 11, 'YYMM') || '-' || lpad(public.next_org_counter(v_org, 'borrowing')::text, 3, '0'),
    'Galih Prasetyo', 'Perlengkapan malam puncak Gebyar Kemerdekaan 2026', (ev->>'gebyar')::uuid, d + 11, d + 13, 'REQUESTED',
    (mem->>'Galih')::uuid)
  returning id into v_borrow;
  insert into public.borrowing_items (organization_id, borrowing_id, inventory_unit_id)
  select v_org, v_borrow, u.id from public.inventory_units u
   where u.organization_id = v_org and u.unit_code in ('TND-001','TND-002','TND-003','SND-001','PRY-001','HTK-001','HTK-002','LMP-001','LMP-002','LMP-003','LMP-004');

  -- -------------------------------------------------------------------
  -- Bersihkan audit log hasil seed, lalu isi beberapa riwayat bermakna
  -- -------------------------------------------------------------------
  delete from public.audit_logs where organization_id = v_org or organization_id is null;
  insert into public.audit_logs (organization_id, actor_name, action, entity, summary, created_at) values
    (v_org, 'Budi Santoso', 'UPDATE', 'inventory_units', 'Budi Santoso mengubah status unit "TND-002" dari MAINTENANCE menjadi AVAILABLE.', now() - interval '33 days'),
    (v_org, 'Anisa Wulandari', 'APPROVE', 'finance_transactions', 'Anisa Wulandari menyetujui transaksi sponsor Gebyar Kemerdekaan 2026.', now() - interval '30 days'),
    (v_org, 'Muhammad Rizky Pratama', 'CREATE', 'events', 'Muhammad Rizky Pratama menambahkan event "Bakti Sosial Pemuda RW 05".', now() - interval '12 days'),
    (v_org, 'Budi Santoso', 'UPDATE', 'borrowings', 'Budi Santoso mengubah status peminjaman hajatan Pak Suharno dari APPROVED menjadi BORROWED.', now() - interval '2 days');

  perform public.refresh_achievements(v_org);
end
$seed$;
