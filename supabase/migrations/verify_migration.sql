-- Test script to verify database migration success
-- This script validates the migration changes

-- Check if residual columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'risks' 
  AND column_name IN ('residual_likelihood', 'residual_impact');

-- Check constraints on residual columns
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  consrc as constraint_source
FROM pg_constraint 
WHERE conrelid = 'public.risks'::regclass 
  AND conname LIKE '%residual%';

-- Check indexes created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'risks' 
  AND indexname LIKE 'idx_risks_%';

-- Verify data integrity - check for any NULL residual values
SELECT 
  COUNT(*) as total_risks,
  COUNT(residual_likelihood) as risks_with_residual_likelihood,
  COUNT(residual_impact) as risks_with_residual_impact,
  COUNT(*) - COUNT(residual_likelihood) as missing_residual_likelihood,
  COUNT(*) - COUNT(residual_impact) as missing_residual_impact
FROM public.risks;

-- Sample data validation
SELECT 
  id,
  title,
  inherent_likelihood,
  inherent_impact,
  residual_likelihood,
  residual_impact,
  status
FROM public.risks 
WHERE residual_likelihood IS NOT NULL 
  OR residual_impact IS NOT NULL 
LIMIT 5;