# Connector API contract research

- Greenhouse official Job Board API: `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs`; `?content=true` includes full description, departments, and offices. Source: https://docs.greenhouse.io/job-board.html
- Ashby official public job posting API: `GET https://api.ashbyhq.com/posting-api/job-board/{JOB_BOARD_NAME}?includeCompensation={true/false}`. Response contains `jobs`; `isListed=false` means the job should not be displayed publicly. Source: https://developers.ashbyhq.com/docs/public-job-posting-api
- Lever official public Postings API: `GET /v0/postings/SITE?skip=X&limit=Y&mode=json`; `skip` is a numeric count from the start and `limit` caps results. Source: https://github.com/lever/postings-api
- GOV.UK Apprenticeship service Display Advert API v2: base URL `https://api.apprenticeships.education.gov.uk/vacancies`; requests require `Ocp-Apim-Subscription-Key` and `X-Version: 2`. Sources: https://developer.apprenticeships.education.gov.uk/ and https://developer.apprenticeships.education.gov.uk/Documentation/display-advert-api-v2
