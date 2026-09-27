# Detailed RecoverLine README

## Goal
Replace the starter README with a polished, repository-ready guide that accurately explains RecoverLine, supports the problem statement with credible research, and gives judges or contributors everything needed to understand and run the prototype.

## README contents
- Open with the bold project name, concise product summary, prototype disclaimer, and published application link.
- Explain the post-discharge care problem and quantify the gap using authoritative AHRQ/peer-reviewed sources with direct links.
- Describe the solution and the complete workflow: discharge upload, AI task extraction, scheduled SMS check-ins, reply classification, deterministic escalation, caregiver notification, resolution, and audit trail.
- Add Mermaid diagrams for:
  - System architecture and trust boundaries.
  - End-to-end check-in/escalation sequence.
  - Database entity-relationship model with keys and cardinalities.
- Document deterministic safety rules, including `UNCLEAR`, `CONTACT_FAILURE`, the 5-minute demo window, webhook signature validation, authenticated coordinator access, and synthetic-data-only limitations.
- Inventory the public and authenticated pages, server functions, webhook, scheduler, database, AI, and Twilio responsibilities.
- Include prerequisites, clone/install/environment/run/build instructions, required configuration values, Twilio trial limitations, webhook URL, and scheduler setup notes without exposing secrets.
- Include demo/testing guidance, current limitations, technology stack, repository map, and source references.
- End with the published link: https://health-check-relay.lovable.app

## Accuracy and validation
- Derive architecture and schema details from the current source and migrations rather than assumptions.
- Preserve the explicit distinction that AI classifies language while deterministic code decides escalation.
- Verify the final Markdown structure, Mermaid syntax, links, and current project diagnostics after editing.
