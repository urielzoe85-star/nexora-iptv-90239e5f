
REVOKE EXECUTE ON FUNCTION public.automation_reclaim_stuck(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.automation_reclaim_stuck(int) TO service_role;
