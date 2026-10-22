---
kind: primary
routes:
  web: Documentation site
steps:
  - text: The Developer opens the documentation page, which shows the current version
    kind: actor
    actor: developer
    entities:
      - { entity: version, effect: reads, facts: [Version number] }
    contexts:
      web: { place: documentation-site::documentation }
  - text: The Developer reads the installation, usage, debugging, environment, runner capability, and Git Flow toolkit sections
    kind: actor
    actor: developer
    entities: []
    contexts:
      web: { place: documentation-site::documentation }
  - text: The page's sections cover installing and operating the runner
    kind: condition
    entities: []
---

# Read the documentation

## Trigger

The Developer wants to install, configure, or operate the product.

## Outcome

The Developer has read the sections covering their platform and use case.
