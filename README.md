# Maldives Explorer: design work

Design deliverables for the Maldives Explorer travel site (code lives in a separate repository).

- [`docs/design/palettes/`](docs/design/palettes/): six colour directions for team review, with CSS, JSON tokens and SVG swatch sheets.
- [`docs/ui-redesign/`](docs/ui-redesign/): public site UI redesign as an applyable patch, plus the review and gap report.
- [`docs/design/mockups/`](docs/design/mockups/): concept homepage, resort page and mobile screens for each palette (HTML and PNG).
- [`site/`](site/): the full Maldives Explorer site code (Next.js, Prisma, Auth.js), as supplied in `MaldivesExplorer-master.zip`. Original code without the UI redesign; the redesign is a patch in `docs/ui-redesign/` (`git am`, or `git apply` from inside `site/`). Run it with `site/Documentation/Development_Setup.md`. The CI workflow in `site/.github/` only runs if the folder moves to a repo root.
