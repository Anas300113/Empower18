-- Register the first production ingestion source. The connector reads GOVUK_API_KEY
-- from the Vercel environment; no credential is stored in the database.
INSERT INTO public.opportunity_sources (
  name, organisation, type, official_url, api_endpoint, connector_id,
  auth_required, permitted_use, terms_of_service_url, retrieval_schedule,
  rate_limit, source_authority, is_active
)
SELECT
  'GOV.UK Find an Apprenticeship', 'Department for Education', 'api'::public.source_type,
  'https://www.findapprenticeship.service.gov.uk/',
  'https://api.apprenticeships.education.gov.uk/vacancies', 'govuk', true,
  'Official public apprenticeship vacancy data for student opportunity discovery.',
  'https://www.gov.uk/help/terms-conditions', 'hourly', 'provider-defined',
  'government', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources WHERE connector_id = 'govuk'
);
