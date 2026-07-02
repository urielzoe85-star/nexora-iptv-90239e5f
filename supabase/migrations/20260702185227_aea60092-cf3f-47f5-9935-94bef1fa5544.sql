
REVOKE ALL ON FUNCTION public.backup_capture_integrity(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.backup_restore_drill(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backup_capture_integrity(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.backup_restore_drill(TEXT) TO service_role;
