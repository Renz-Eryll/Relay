<h1 align="center">Relay</h1>

<p align="center">
  A support desk for customers, agents and admins: tickets routed by category, one conversation thread per ticket,<br/>
  notifications, and an audit trail of every change.
</p>

<p align="center">
  <a href="https://relay-helpdesk.vercel.app"><b>Live demo</b></a> ·
  try it as a <a href="https://relay-helpdesk.vercel.app/demo/customer">customer</a>,
  <a href="https://relay-helpdesk.vercel.app/demo/agent">agent</a> or
  <a href="https://relay-helpdesk.vercel.app/demo/admin">admin</a> (resets daily)
</p>

---

## Features

**Customers**
- Raise a ticket in one of five categories, with a priority
- Follow status, replies and assignment in a single thread
- Close a ticket, or reopen it if the problem comes back

**Agents**
- A queue for their category: tickets assigned to them, plus unassigned ones they can claim
- Reply, set priority, and move tickets through open → in progress → resolved → closed

**Admins**
- Dashboard of open, in-progress and unassigned work, average resolution time, and load per agent
- Assign tickets to agents (agents in the ticket's category are suggested first)
- Category overview, and agent management (add, edit, remove; their open tickets return to the queue)

**Everyone**
- Notifications for new tickets, replies, assignments and status changes
- Audit trail on every ticket: who changed the status, priority or assignee, and when
- Password reset with a 6-digit email code (10-minute expiry, 5 attempts, 3 codes per hour)
- Search by subject, customer or `#number`; filters live in the URL

## Security

- Every server action checks the signed-in user and their role; ticket access goes through one permissions module
- Tickets you can't see return 404, the same as tickets that don't exist
- bcrypt password hashing, signed `httpOnly` session cookies, hashed reset codes compared in constant time
- Sign-in and reset responses don't reveal which emails have accounts
- Shared demo accounts can't change their email or password, and demo agents can't be removed

## Stack

Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS v4 · Drizzle ORM · Neon Postgres · Zod · Vercel (hosting + daily cron)

## Getting started

```bash
npm install
cp .env.example .env.local   # or: vercel env pull .env.local
npm run db:push              # create tables
npm run db:seed              # demo workspace: 6 staff, 5 customers, 26 tickets
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (type-checks and lints) |
| `npm run db:push` | Sync the Drizzle schema to the database |
| `npm run db:seed` | Recreate the demo workspace |

## Project structure

```
src/
  app/
    (app)/          signed-in pages: dashboard, queue, tickets, categories, agents, notifications, settings
    actions/        server actions (auth, tickets, people), each validated with Zod and permission-checked
    api/cron/       daily demo reset
  db/               Drizzle schema, client and seed script
  lib/              auth, permissions, data access, notifications, mail
  components/       UI building blocks
```

## Background

Relay is my own rewrite of the support-ticketing system I built with my team during our internship
(React + Laravel + MySQL: [PerezJY/Ticketing-System](https://github.com/PerezJY/Ticketing-System), with Jenny Rose Perez, Jowen, Precious, Katherine and Kyle).
It keeps the same roles and workflow, with a new codebase, a single TypeScript stack, proper authorization on every action,
one notifications model instead of three, an audit trail, and a public demo.

## Contact

**Renz Eryll Ramelo** · [LinkedIn](https://www.linkedin.com/in/renz-eryll-ramelo) · [GitHub](https://github.com/Renz-Eryll)
