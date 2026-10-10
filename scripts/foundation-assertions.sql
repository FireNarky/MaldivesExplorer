-- Assertion queries from Documentation/Database_Design.md §6.4.
-- Each statement must return zero rows.

-- Offer room belongs to the offer resort.
SELECT o.id
FROM offers o
JOIN room_types r ON r.id = o.room_type_id
WHERE r.resort_id <> o.resort_id;

-- Active quote version belongs to the quote.
SELECT q.id
FROM quotes q
JOIN quote_versions v ON v.id = q.active_version_id
WHERE v.quote_id <> q.id;

-- Vocabulary set mismatches.
SELECT o.id, 'meal_plan' AS field
FROM offers o
JOIN vocabulary_items v ON v.id = o.meal_plan_id
WHERE v.set <> 'MEAL_PLAN'
UNION ALL
SELECT o.id, 'occupancy'
FROM offers o
JOIN vocabulary_items v ON v.id = o.occupancy_basis_id
WHERE v.set <> 'OCCUPANCY_BASIS'
UNION ALL
SELECT r.id, 'price_band'
FROM resorts r
JOIN vocabulary_items v ON v.id = r.price_band_id
WHERE v.set <> 'PRICE_BAND';

-- Published offer whose resort is not published.
SELECT o.id
FROM offers o
JOIN resorts r ON r.id = o.resort_id
WHERE o.status = 'PUBLISHED'
  AND r.status <> 'PUBLISHED';

-- Saved item whose target is missing.
SELECT s.id
FROM saved_items s
LEFT JOIN resorts r ON s.entity_type = 'RESORT' AND r.id = s.entity_id
LEFT JOIN offers o ON s.entity_type = 'OFFER' AND o.id = s.entity_id
LEFT JOIN experiences e ON s.entity_type = 'EXPERIENCE' AND e.id = s.entity_id
LEFT JOIN articles a ON s.entity_type = 'ARTICLE' AND a.id = s.entity_id
WHERE r.id IS NULL AND o.id IS NULL AND e.id IS NULL AND a.id IS NULL;

-- Collection items with a missing target.
SELECT c.id
FROM collection_items c
LEFT JOIN resorts r ON c.entity_type = 'RESORT' AND r.id = c.entity_id
LEFT JOIN offers o ON c.entity_type = 'OFFER' AND o.id = c.entity_id
LEFT JOIN experiences e ON c.entity_type = 'EXPERIENCE' AND e.id = c.entity_id
LEFT JOIN articles a ON c.entity_type = 'ARTICLE' AND a.id = c.entity_id
LEFT JOIN islands i ON c.entity_type = 'ISLAND' AND i.id = c.entity_id
LEFT JOIN atolls t ON c.entity_type = 'ATOLL' AND t.id = c.entity_id
WHERE r.id IS NULL AND o.id IS NULL AND e.id IS NULL
  AND a.id IS NULL AND i.id IS NULL AND t.id IS NULL;

-- Content relations with a missing target.
SELECT c.id
FROM content_relations c
LEFT JOIN resorts r ON c.entity_type = 'RESORT' AND r.id = c.entity_id
LEFT JOIN offers o ON c.entity_type = 'OFFER' AND o.id = c.entity_id
LEFT JOIN experiences e ON c.entity_type = 'EXPERIENCE' AND e.id = c.entity_id
LEFT JOIN articles a ON c.entity_type = 'ARTICLE' AND a.id = c.entity_id
LEFT JOIN islands i ON c.entity_type = 'ISLAND' AND i.id = c.entity_id
LEFT JOIN atolls t ON c.entity_type = 'ATOLL' AND t.id = c.entity_id
WHERE r.id IS NULL AND o.id IS NULL AND e.id IS NULL
  AND a.id IS NULL AND i.id IS NULL AND t.id IS NULL;

-- Media links with a missing target.
SELECT m.id
FROM media_links m
LEFT JOIN resorts r ON m.owner_type = 'RESORT' AND r.id = m.owner_id
LEFT JOIN room_types rooms ON m.owner_type = 'ROOM_TYPE' AND rooms.id = m.owner_id
LEFT JOIN dining_venues d ON m.owner_type = 'DINING_VENUE' AND d.id = m.owner_id
LEFT JOIN islands i ON m.owner_type = 'ISLAND' AND i.id = m.owner_id
LEFT JOIN atolls t ON m.owner_type = 'ATOLL' AND t.id = m.owner_id
LEFT JOIN experiences e ON m.owner_type = 'EXPERIENCE' AND e.id = m.owner_id
LEFT JOIN offers o ON m.owner_type = 'OFFER' AND o.id = m.owner_id
LEFT JOIN articles a ON m.owner_type = 'ARTICLE' AND a.id = m.owner_id
LEFT JOIN expert_profiles experts ON m.owner_type = 'EXPERT' AND experts.id = m.owner_id
LEFT JOIN collections collections ON m.owner_type = 'COLLECTION' AND collections.id = m.owner_id
LEFT JOIN awards awards ON m.owner_type = 'AWARD' AND awards.id = m.owner_id
WHERE r.id IS NULL AND rooms.id IS NULL AND d.id IS NULL AND i.id IS NULL
  AND t.id IS NULL AND e.id IS NULL AND o.id IS NULL AND a.id IS NULL
  AND experts.id IS NULL AND collections.id IS NULL AND awards.id IS NULL;

-- Attachments with a missing target.
SELECT att.id
FROM attachments att
LEFT JOIN enquiries enquiries ON att.owner_type = 'ENQUIRY' AND enquiries.id = att.owner_id
LEFT JOIN quote_versions versions ON att.owner_type = 'QUOTE_VERSION' AND versions.id = att.owner_id
LEFT JOIN notes notes ON att.owner_type = 'NOTE' AND notes.id = att.owner_id
LEFT JOIN messages messages ON att.owner_type = 'MESSAGE' AND messages.id = att.owner_id
WHERE enquiries.id IS NULL AND versions.id IS NULL AND notes.id IS NULL AND messages.id IS NULL;

-- Global FAQ with an owner, or owned FAQ without an owner.
SELECT id FROM faqs
WHERE (owner_type = 'GLOBAL' AND owner_id IS NOT NULL)
   OR (owner_type <> 'GLOBAL' AND owner_id IS NULL);

-- More than one active SLA.
SELECT count(*) FROM sla_policies WHERE active HAVING count(*) > 1;

-- Quote header drift.
SELECT v.id
FROM quote_versions v
JOIN LATERAL (
  SELECT
    coalesce(sum(quantity * unit_amount) FILTER (
      WHERE item_type NOT IN ('TAX', 'FEE', 'DISCOUNT')
    ), 0) AS subtotal,
    coalesce(sum(tax_amount), 0) + coalesce(sum(line_total) FILTER (
      WHERE item_type = 'TAX'
    ), 0) AS tax_total,
    coalesce(sum(line_total) FILTER (WHERE item_type = 'FEE'), 0) AS fee_total,
    coalesce(sum(discount_amount), 0) + coalesce(sum(line_total) FILTER (
      WHERE item_type = 'DISCOUNT'
    ), 0) AS discount_total
  FROM quote_items
  WHERE quote_version_id = v.id
) lines ON true
WHERE v.subtotal <> lines.subtotal
   OR v.tax_total <> lines.tax_total
   OR v.fee_total <> lines.fee_total
   OR v.discount_total <> lines.discount_total
   OR v.grand_total <> (lines.subtotal + lines.tax_total + lines.fee_total - lines.discount_total);
