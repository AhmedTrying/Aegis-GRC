-- Indexes to optimize risk queries per tenant and common filters/sorts
CREATE INDEX IF NOT EXISTS idx_risks_owner ON public.risks(owner);
CREATE INDEX IF NOT EXISTS idx_risks_next_review_date ON public.risks(next_review_date);
CREATE INDEX IF NOT EXISTS idx_risks_org_id_score ON public.risks(org_id, score);

-- Optional: acceptance status frequently filtered
CREATE INDEX IF NOT EXISTS idx_risks_acceptance_status ON public.risks(acceptance_status);