# 08 — DevOps: Deployment, Scalability, Observability

Covers cloud architecture, CI/CD, scaling, caching, monitoring, and backup/recovery (NFR-2/3/9/10/12).

---

## 1. Cloud Deployment Architecture (AWS)

```
                       Route 53 (DNS)
                            │
                     CloudFront (CDN, TLS, WAF)
              ┌──────────────┴───────────────┐
        static/media (S3)            api.campuskrafts.com
                                            │
                                   Application Load Balancer
                                            │  (multi-AZ)
                              ┌─────────────┴─────────────┐
                        ECS Fargate (API tasks)     ECS Fargate (workers:
                        autoscaled 2..N                  BullMQ grading,
                              │                          notifications,
                              │                          recording ingest)
        ┌─────────────┬───────┴────────┬──────────────┐
   RDS PostgreSQL   ElastiCache     S3 (media)     LiveKit cluster
   (Multi-AZ,        Redis          + CloudFront    (EC2/EKS, autoscaled
    read replicas)  (cluster)        signed URLs     SFU for built-in live)
```

- **Compute**: ECS Fargate (serverless containers) — API and background workers as separate services. EKS is the alternative at larger scale.
- **DB**: RDS PostgreSQL 16, Multi-AZ (auto-failover), read replicas for analytics/leaderboard reads.
- **Cache/Queue**: ElastiCache Redis (cluster mode) — cache, rate limits, leaderboards, BullMQ.
- **Storage/CDN**: S3 (private) + CloudFront signed URLs for videos/sheets/recordings.
- **Live**: LiveKit SFU cluster (built-in classroom); Zoom/Meet external.
- **Edge**: CloudFront + AWS WAF (OWASP managed rules, rate rules).
- **Secrets**: Secrets Manager / SSM. **IaC**: Terraform (VPC, subnets, ECS, RDS, ElastiCache, S3, CloudFront, IAM).

### Environments
`dev` → `staging` → `production`, parity via the same Terraform modules + container images. Separate AWS accounts (or VPCs) per environment.

---

## 2. CI/CD Pipeline (GitHub Actions)

```
push / PR
  └─ lint + typecheck + unit tests (jest) + prisma validate
  └─ build Docker image  → push to ECR (tag = git SHA)
  └─ run integration tests (ephemeral Postgres+Redis services)
on merge to main:
  └─ deploy to STAGING (ECS update-service) → run `prisma migrate deploy`
  └─ smoke tests (health, login, enroll) 
  └─ manual approval gate
  └─ deploy to PRODUCTION (blue/green via CodeDeploy) → migrate → smoke
```

- **Migrations**: `prisma migrate deploy` runs as a one-off ECS task before traffic shift (expand/contract for zero-downtime schema changes).
- **Rollback**: blue/green keeps the previous task set; revert by shifting traffic back; DB migrations are backward-compatible (expand-then-contract).
- **Image**: multi-stage Dockerfile (build → slim runtime), non-root user, healthcheck.

---

## 3. Scalability Strategy

| Layer | Strategy |
|-------|----------|
| API | Stateless tasks behind ALB; horizontal autoscale on CPU/RAM + RPS. Target tracking 60% CPU. |
| Spiky events (mock tests) | Pre-scale (scheduled scaling) before known mock windows; queue heavy grading to workers. |
| DB | Read replicas for reads (leaderboard, analytics); connection pooling (PgBouncer/RDS Proxy); partition `answer_responses`/`question_attempts` by month at volume. |
| Cache | Redis for hot reads (course curriculum, exam metadata, sessions, leaderboards). |
| Media | Offloaded to S3/CloudFront — API never streams bytes. |
| Live | LiveKit SFU scales by participants; media off the API entirely. |
| Async | BullMQ workers scale independently (grading, notifications, recording ingest, ranking finalization). |

Targets: 10k+ concurrent steady; 50k+ during scheduled mocks (NFR-2).

---

## 4. Caching Strategy

| Data | Store | TTL / Invalidation |
|------|-------|--------------------|
| Course curriculum | Redis | 10 min; bust on course/lesson write |
| Exam metadata | Redis | until exam edit |
| Mock leaderboard | Redis ZSET | live; rebuildable from `mock_results` |
| Session validation | JWT (stateless) | n/a (no cache needed) |
| Rate-limit counters | Redis | sliding window |
| Analytics overview | Redis / materialized views | 5–15 min |
| Signed media URLs | client-side | until `expiresIn` |

Patterns: cache-aside for reads; write-through bust on mutation; ETag/`Cache-Control` on CDN assets.

---

## 5. Monitoring & Observability

- **Metrics**: Prometheus (or CloudWatch) — RPS, p50/p95/p99 latency, error rate, DB connections, Redis hit rate, queue depth, autoscaling signals. Dashboards in **Grafana**.
- **Logs**: structured JSON (pino) → CloudWatch Logs / **Loki**; correlation via `traceId` from the error envelope.
- **Traces**: **OpenTelemetry** → Tempo/X-Ray (API → DB → Redis spans).
- **Errors**: **Sentry** (backend + web + mobile) with release tagging.
- **Uptime/synthetics**: health checks (`/health`) + synthetic login/enroll probes.
- **Alerting**: PagerDuty/Slack on SLO burn (p95 > 300 ms, 5xx > 1%, queue backlog, DB CPU > 80%, failover events).

SLOs: 99.9% availability; API p95 < 300 ms (non-media); exam autosave ack < 2 s.

---

## 6. Backup & Recovery (RPO ≤ 15 min, RTO ≤ 1 h)

- **RDS**: automated daily snapshots + **PITR** (continuous WAL) → RPO ~5 min; 35-day retention; cross-region snapshot copy for DR.
- **S3**: versioning + cross-region replication; lifecycle to Glacier for old recordings.
- **Redis**: AOF persistence; non-authoritative (rebuildable from Postgres) — leaderboards re-derived from `mock_results`.
- **Restore drills**: quarterly game-days restoring RDS PITR into staging; documented runbook.
- **DR**: warm standby region (snapshots + IaC); failover by re-pointing Route 53 + restoring RDS.
- **Config/secrets**: versioned in Secrets Manager; IaC in git.

---

## 7. Runbooks (selected)
- **Stuck payment**: query `payments WHERE status='PENDING' AND createdAt < now()-15m` → re-verify with gateway → reconcile.
- **Mock spike**: confirm pre-scale; watch Redis CPU + ALB queue; workers scale on queue depth.
- **DB failover**: Multi-AZ auto-promotes; verify app reconnect (RDS Proxy); check replica lag.

---

Next: [09 — Adaptive Learning →](09-ADAPTIVE-LEARNING.md)
