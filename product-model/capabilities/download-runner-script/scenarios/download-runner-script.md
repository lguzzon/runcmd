---
kind: primary
routes:
  web: Documentation site
steps:
  - text: The Developer opens the documentation site, which shows the current version
    kind: actor
    actor: developer
    entities:
      - { entity: version, effect: reads, facts: [Version number] }
    contexts:
      web: { place: documentation-site::home }
  - text: The Developer chooses to download the runner script
    kind: actor
    actor: developer
    entities: []
    contexts:
      web: { place: documentation-site::home }
  - text: The browser downloads runcmd.sh
    kind: product
    actor: developer
    entities: []
---

# Download the runner script

## Trigger

The Developer wants the runner script.

## Outcome

The Developer has runcmd.sh.

## Edge cases

- The download is also offered from the documentation page.
