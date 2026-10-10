# Maldives Explorer Cursor Instructions

Before performing development work, read:

1. README_FOR_CURSOR.md
2. Maldives_Explorer_Complete_Documentation_Suite.docx
3. Implementation_Plan.md
4. Database_Design.md
5. Design_System.md
6. SRS Maldives Explorer.docx
7. Complete Product Vision & Cursor Master Documentation.docx
8. Tourism_Marketplace_Development_Diagrams.pptx

## Source-of-truth precedence

When requirements conflict:

1. Explicit owner decisions recorded in Documentation/Decisions.md
2. Maldives_Explorer_Complete_Documentation_Suite.docx
3. Implementation_Plan.md for delivery scope and sequence
4. Database_Design.md for database contracts
5. Design_System.md for UI contracts
6. SRS Maldives Explorer.docx
7. Product Vision document
8. Architecture diagrams
9. Existing implementation

A specialized document controls its own area unless it conflicts with
an explicit owner decision or the Complete Documentation Suite.

Documentation/Stage_0_Checklist.md is the exit gate for Stage 0.
Documentation/adr/ records technical decisions. An ADR does not override
Decisions.md, the suite, or the specialized contracts above.
Documentation/Documentation_Correction_Report.md is a review record.

Do not start a later development stage until the current stage passes
its exit criteria.

Do not add placeholder features, fictional content, fake prices,
fake availability, fake reviews or dead controls.