
## SalesWay overview

SalesWay is a workspace-style platform for service-based companies, built to track sales reps’ daily activity, provide real-time transparency across the team, and enable scalable performance management. The platform centralizes reporting, computes performance KPIs, and gives managers visibility and control without adding friction to the reps’ workflow.

### Account provisioning and roles

Users do not self-register. Accounts are created by an Admin/Manager, who provisions users, assigns roles (Admin / Manager / Sales Agent), and sends an invite or initial credentials (activation link / temporary password). Agents can later change only their password (and optionally minimal profile data), while identity fields (email), roles, and team membership remain company-managed.

### Dashboard and analytics

After authentication, users land on the Dashboard, which provides charts and reports for current team activity and historical trends (daily/weekly/monthly), personal performance (individual KPIs and trends), and key metrics such as call volume, conversions, revenue collected, and operational indicators.

### Daily activity form

Each agent submits a daily numeric activity report. The platform distinguishes between:

- Manual inputs entered by the agent.
- Automatically computed metrics (rates, averages, commissions, etc.).

Example inputs include outbound dials, pickups, conversations 30 sec+, sales call outcomes (calendar/booked/no-show/reschedule/cancel), deposits, sales (one-call close/followup/upsell), contract value, and new cash collected. These inputs power both individual and team-level analytics.

### Autosave, submission, and real-time updates

Daily reporting follows a two-step flow:

1. Draft with autosave: agents can update values throughout the day without losing progress.
2. Send (end-of-day submission): once submitted, the company dashboard updates in real time and the manager receives a notification.

If an agent does not report:

- At 20:00, the manager is notified that no updates were made.
- At 23:59, the system auto-finalizes the day:
  - If draft data exists → it is submitted automatically.
  - If no data exists → all fields are recorded as 0.
- The form resets for the next day.

### Manager capabilities

Managers have additional controls such as team filters and per-agent reporting views, plus the ability to edit reports when necessary (with an audit trail for traceability).

### AI sales assistant (chatbot) backed by internal documentation

SalesWay includes a sales-focused chatbot connected via API and grounded in a knowledge base (playbooks, scripts, internal rules). The assistant can provide practical coaching and improvement suggestions, explain KPIs, formulas, and processes, and generate recommendations based on trends (without modifying official report data).

### Expected (forecasting) and tasks

- Expected (forecasting): managers can view projected future revenue based on historical performance and current activity signals.
- Tasks: users can define daily/weekly targets (e.g., “50 outbound dials/day”) and track progress individually and across the team.
