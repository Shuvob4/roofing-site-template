# Roofing Site Template

A reusable, resellable marketing website template for residential and commercial
roofing companies. Built once, then rebranded and sold to local roofing businesses
by swapping content, images, and domain.

> **Private repo.** This is internal product source. Clients never receive repo
> access — they get only the deployed site and (paid tier) a CMS login.

## Goal

Ship a polished, conversion-focused roofing website that any local contractor would
pay to put their name on, with content cleanly separated from code so each resale is
a fast rebrand rather than a rebuild.

## Two-tier model

**Tier 1 — Dev / Demo (build first)**
A complete static marketing site with placeholder content and no paid integrations.
Used to demo to prospects, and as the base each client deployment is cloned from.

**Tier 2 — Paid (designed now, built later)**
Adds owner self-service and lead handling on top of Tier 1:

- Non-technical owner edits all content without repo access — mobile-first, occasional desktop.
- Quote requests + inspection/viewing booking.
- Email + SMS notifications to the owner; auto-confirmation to the customer.
- Lead dashboard.

## Core principles

- **Content/code separation.** Copy, images, services, hours, and contact info are
  config- or CMS-driven, so a new client is a content swap, not a code change.
- **Themeable.** Colors, fonts, and branding are swappable per client.
- **Owner-safe editing.** The paid tier never exposes the repo; editing happens
  through a hosted CMS/dashboard.
- **Budget-aware.** Per-client recurring stack (hosting + CMS + email + SMS +
  booking) targets **$12–30 CAD/month**. Domain is separate (annual).

## Stack

_To be finalized via the Kiro spec (`design.md`)._ Working assumption: a
static-first framework with a headless/hosted CMS for the paid tier. Final choices
and the cost model come out of the spec process.

## Repo structure

_Generated during the spec/implementation phase — documented here once scaffolding
exists._

## Development

Built in Kiro using spec-driven development (Requirements-First). Detailed
requirements, technical design, and task breakdown live in the spec files
(`requirements.md`, `design.md`, `tasks.md`), not in this README.

## Reselling a deployment

_Process to be filled in once Tier 1 is built:_

1. Clone the template.
2. Swap content, images, and theme tokens.
3. Assign client domain + hosting.
4. (Paid tier) Provision CMS, notifications, and booking; hand off the CMS login.

## License

Private and proprietary. Not for distribution.
