create table if not exists source_pages (
  id varchar(64) primary key,
  slug varchar(64),
  title varchar(255),
  chapter_scope varchar(32),
  source_url varchar(1024),
  source_status varchar(64),
  source_notes text,
  safe_to_publish boolean,
  published boolean
);

create table if not exists source_assets (
  id varchar(64) primary key,
  page_slug varchar(64),
  title varchar(255),
  asset_url varchar(1024),
  asset_kind varchar(64),
  status varchar(64),
  notes text
);

create table if not exists migration_runs (
  id varchar(64) primary key,
  executed_at varchar(64),
  importer varchar(64),
  summary text,
  skipped_items text
);

create table if not exists seed_snapshots (
  id varchar(64) primary key,
  created_at varchar(64),
  artifact_path varchar(255),
  notes text
);
