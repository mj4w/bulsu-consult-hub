-- Clear all calendar/schedule data for every instructor and student.
--
-- This deletes:
-- 1. Student consultation requests, including pending, approved, declined, cancelled, and calendar sync metadata.
-- 2. Availability program scopes.
-- 3. Instructor availability windows.
--
-- This does NOT delete:
-- - Supabase auth users
-- - profile records
-- - student/instructor account details
-- - external Microsoft/Outlook calendar events that may have already been downloaded or synced
--
-- Run manually in Supabase SQL Editor only when you intentionally want
-- to reset all consultation calendar data.

begin;

select
  (select count(*) from public.consultation_requests) as consultation_requests_before,
  (select count(*) from public.availability_programs) as availability_programs_before,
  (select count(*) from public.instructor_availability) as instructor_availability_before;

delete from public.consultation_requests;
delete from public.availability_programs;
delete from public.instructor_availability;

select
  (select count(*) from public.consultation_requests) as consultation_requests_after,
  (select count(*) from public.availability_programs) as availability_programs_after,
  (select count(*) from public.instructor_availability) as instructor_availability_after;

commit;
