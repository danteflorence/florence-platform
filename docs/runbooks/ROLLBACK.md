# Rollback Runbook

Rollback keeps the prior known-good Cloud Run revision serving while preserving auditability and data integrity.

## Before Rollback

- Identify the environment, service, image tag, and revision.
- Confirm whether migrations have run.
- Capture sanitized incident notes without PII, secrets, restricted document contents, or packet contents.

## Cloud Run Revision Rollback

List revisions:

```sh
gcloud run revisions list --service <service-name>-staging --region us-central1
```

Move all traffic to the prior healthy revision:

```sh
gcloud run services update-traffic <service-name>-staging --region us-central1 --to-revisions <prior-revision>=100
```

Repeat for affected services only.

## Image Rollback

If a Terraform plan points at a bad image tag, rerun plan/apply with the prior approved tag:

```sh
cd /Users/dantetolbedantert/florence-work/infra
terraform plan -var-file=envs/staging.tfvars -var="image_tag=<prior-good-sha>"
terraform apply -var-file=envs/staging.tfvars -var="image_tag=<prior-good-sha>"
```

Apply only after review by an authorized operator.

## Migration Rollback

- Prefer forward-fix migrations for staging once a migration has written data.
- Do not manually delete sensitive records to force a rollback.
- Do not weaken tenant scope, consent, audit logging, signed URLs, or fail-closed gates to restore service.

## Verification

- Health checks pass for affected services.
- Login and app shell load in staging.
- Migration jobs are not repeatedly failing.
- Audit logs remain intact.
- No real user data was copied into staging or sandbox.

## Acceptance Criteria

- The prior healthy revision serves traffic.
- The failed image tag is documented.
- Data integrity and audit trails are preserved.
- Follow-up work is filed for any forward-fix migration or security review.
