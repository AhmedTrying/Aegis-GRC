-- Add residual_likelihood and residual_impact columns to risks table
ALTER TABLE public.risks 
ADD COLUMN IF NOT EXISTS residual_likelihood integer 
  CHECK (residual_likelihood >= 1 AND residual_likelihood <= 5);

ALTER TABLE public.risks 
ADD COLUMN IF NOT EXISTS residual_impact integer 
  CHECK (residual_impact >= 1 AND residual_impact <= 5);

-- Add org_id constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'risks_org_id_fkey') THEN
    ALTER TABLE public.risks 
    ADD CONSTRAINT risks_org_id_fkey 
    FOREIGN KEY (org_id) REFERENCES public.organizations(id);
  END IF;
END $$;

-- Add org_id NOT NULL constraint
ALTER TABLE public.risks 
ALTER COLUMN org_id SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_risks_org_id ON public.risks(org_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON public.risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_category ON public.risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_department ON public.risks(department);

-- Update existing risks to have default residual values
UPDATE public.risks 
SET residual_likelihood = inherent_likelihood, 
    residual_impact = inherent_impact 
WHERE residual_likelihood IS NULL OR residual_impact IS NULL;