-- Diagnostic script for duplicate consultation request errors.
-- Run this in Supabase SQL Editor if inserts still show duplicate request errors.

select
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'consultation_requests'
  and con.contype = 'u'
order by con.conname;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'consultation_requests'
  and indexdef ilike '%unique%'
order by indexname;

select
  idx.indexrelid::regclass::text as index_name,
  idx.indisunique as is_unique,
  (
    select array_agg(att.attname order by keys.ordinality)
    from unnest(idx.indkey) with ordinality as keys(attnum, ordinality)
    join pg_attribute att
      on att.attrelid = idx.indrelid
     and att.attnum = keys.attnum
  ) as indexed_columns,
  pg_get_expr(idx.indpred, idx.indrelid) as partial_filter,
  con.conname as backing_constraint
from pg_index idx
join pg_class tbl on tbl.oid = idx.indrelid
join pg_namespace nsp on nsp.oid = tbl.relnamespace
join pg_class idxrel on idxrel.oid = idx.indexrelid
left join pg_constraint con on con.conindid = idx.indexrelid
where nsp.nspname = 'public'
  and tbl.relname = 'consultation_requests'
  and idx.indisunique
order by idxrel.relname;

select
  student_id,
  availability_id,
  requested_start_datetime,
  requested_end_datetime,
  status,
  count(*) as duplicate_count
from public.consultation_requests
group by
  student_id,
  availability_id,
  requested_start_datetime,
  requested_end_datetime,
  status
having count(*) > 1
order by requested_start_datetime desc;
