-- Integrity migration from Documentation/Database_Design.md §8 and §9.
-- Order: functions, checks, triggers, indexes, generated search columns, notes view, sequences.
-- Rollback drops these triggers, checks, generated columns, indexes, the view, and the sequences.
-- Production rollback restores a backup. It does not edit this schema by hand.

CREATE OR REPLACE FUNCTION slug_ok(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT value ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
$$;

CREATE OR REPLACE FUNCTION publication_dates_ok(
  status publish_status,
  published_at timestamptz,
  scheduled_at timestamptz,
  unpublished_at timestamptz,
  archived_at timestamptz
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE status
      WHEN 'PUBLISHED' THEN published_at IS NOT NULL
      WHEN 'SCHEDULED' THEN scheduled_at IS NOT NULL
      WHEN 'ARCHIVED' THEN archived_at IS NOT NULL
      ELSE true
    END
    AND (
      unpublished_at IS NULL
      OR published_at IS NULL
      OR unpublished_at >= published_at
    )
$$;

CREATE OR REPLACE FUNCTION vocabulary_item_in_set(
  item_id uuid,
  expected vocabulary_set
) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT item_id IS NULL OR EXISTS (
    SELECT 1
    FROM vocabulary_items
    WHERE id = item_id
      AND set = expected
  )
$$;

ALTER TABLE atolls ADD CONSTRAINT atolls_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
), ADD CONSTRAINT atolls_slug CHECK (slug_ok(slug));

ALTER TABLE islands ADD CONSTRAINT islands_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
), ADD CONSTRAINT islands_slug CHECK (slug_ok(slug));

ALTER TABLE resorts ADD CONSTRAINT resorts_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
), ADD CONSTRAINT resorts_slug CHECK (slug_ok(slug));

ALTER TABLE room_types ADD CONSTRAINT room_types_slug CHECK (slug_ok(slug));

ALTER TABLE experiences ADD CONSTRAINT experiences_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
), ADD CONSTRAINT experiences_slug CHECK (slug_ok(slug));

ALTER TABLE experience_categories
  ADD CONSTRAINT experience_categories_slug CHECK (slug_ok(slug));

ALTER TABLE offers ADD CONSTRAINT offers_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
), ADD CONSTRAINT offers_slug CHECK (slug_ok(slug));

ALTER TABLE collections ADD CONSTRAINT collections_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
), ADD CONSTRAINT collections_slug CHECK (slug_ok(slug));

ALTER TABLE articles ADD CONSTRAINT articles_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
), ADD CONSTRAINT articles_slug CHECK (slug_ok(slug));

ALTER TABLE content_categories
  ADD CONSTRAINT content_categories_slug CHECK (slug_ok(slug));

ALTER TABLE tags ADD CONSTRAINT tags_slug CHECK (slug_ok(slug));

ALTER TABLE expert_profiles ADD CONSTRAINT experts_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
), ADD CONSTRAINT experts_slug CHECK (slug_ok(slug));

ALTER TABLE awards ADD CONSTRAINT awards_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
);

ALTER TABLE faqs ADD CONSTRAINT faqs_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
);

ALTER TABLE homepage_modules ADD CONSTRAINT homepage_publication CHECK (
  publication_dates_ok(status, published_at, scheduled_at, unpublished_at, archived_at)
);

ALTER TABLE users
  ADD CONSTRAINT users_email_trimmed CHECK (email::text = btrim(email::text)),
  ADD CONSTRAINT users_locale_ok CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

ALTER TABLE customers
  ADD CONSTRAINT customers_email_trimmed CHECK (email::text = btrim(email::text)),
  ADD CONSTRAINT customers_locale_ok CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

ALTER TABLE resorts
  ADD CONSTRAINT resorts_price_complete CHECK (
    indicative_from_price IS NULL
    OR (
      indicative_from_price >= 0
      AND indicative_currency IS NOT NULL
      AND price_basis IS NOT NULL
      AND price_includes_transfer IS NOT NULL
      AND price_includes_tax IS NOT NULL
      AND price_source_note IS NOT NULL
      AND price_reviewed_at IS NOT NULL
    )
  ),
  ADD CONSTRAINT resorts_currency_ok CHECK (
    indicative_currency IS NULL OR indicative_currency ~ '^[A-Z]{3}$'
  ),
  ADD CONSTRAINT resorts_star CHECK (
    star_category IS NULL OR star_category BETWEEN 1 AND 5
  ),
  ADD CONSTRAINT resorts_star_source CHECK (
    star_category IS NULL OR star_category_source IS NOT NULL
  ),
  ADD CONSTRAINT resorts_reef_source CHECK (
    has_house_reef IS NULL
    OR (reef_source_note IS NOT NULL AND reef_reviewed_at IS NOT NULL)
  ),
  ADD CONSTRAINT resorts_popularity CHECK (popularity_rank >= 0);

ALTER TABLE islands
  ADD CONSTRAINT islands_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );

ALTER TABLE atolls
  ADD CONSTRAINT atolls_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );

ALTER TABLE room_types
  ADD CONSTRAINT room_types_occupancy CHECK (max_adults >= 1 AND max_children >= 0),
  ADD CONSTRAINT room_types_size CHECK (size_sqm IS NULL OR size_sqm > 0),
  ADD CONSTRAINT room_types_price CHECK (
    indicative_from_price IS NULL OR indicative_from_price >= 0
  );

ALTER TABLE transfer_options
  ADD CONSTRAINT transfer_duration CHECK (
    duration_minutes IS NULL
    OR (duration_minutes > 0 AND source_note IS NOT NULL)
  );

ALTER TABLE offers
  ADD CONSTRAINT offers_currency CHECK (currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT offers_price CHECK (from_price >= 0),
  ADD CONSTRAINT offers_comparison CHECK (
    comparison_price IS NULL
    OR (comparison_price >= 0 AND comparison_basis_note IS NOT NULL)
  ),
  ADD CONSTRAINT offers_validity CHECK (valid_until >= valid_from),
  ADD CONSTRAINT offers_stay CHECK (
    stay_from IS NULL OR stay_until IS NULL OR stay_until >= stay_from
  ),
  ADD CONSTRAINT offers_min_nights CHECK (min_nights IS NULL OR min_nights >= 1);

ALTER TABLE experiences
  ADD CONSTRAINT experiences_season_source CHECK (
    seasonality IS NULL
    OR (season_source_note IS NOT NULL AND season_reviewed_at IS NOT NULL)
  );

ALTER TABLE articles
  ADD CONSTRAINT articles_reviewer_differs CHECK (
    reviewer_id IS NULL OR reviewer_id <> author_id
  ),
  ADD CONSTRAINT articles_locale CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

ALTER TABLE faqs
  ADD CONSTRAINT faqs_owner CHECK (
    (owner_type = 'GLOBAL' AND owner_id IS NULL)
    OR (owner_type <> 'GLOBAL' AND owner_id IS NOT NULL)
  );

ALTER TABLE expert_profiles
  ADD CONSTRAINT experts_years CHECK (
    years_in_tourism IS NULL OR years_in_tourism >= 0
  );

ALTER TABLE awards
  ADD CONSTRAINT awards_year CHECK (year BETWEEN 1950 AND 2100);

ALTER TABLE media_assets
  ADD CONSTRAINT media_bytes CHECK (byte_size > 0),
  ADD CONSTRAINT media_image_alt CHECK (
    status <> 'PUBLISHED'
    OR kind NOT IN ('IMAGE', 'DRONE')
    OR alt_text IS NOT NULL
  ),
  ADD CONSTRAINT media_video_caption CHECK (
    status <> 'PUBLISHED'
    OR kind <> 'VIDEO'
    OR caption IS NOT NULL
    OR transcript IS NOT NULL
  );

ALTER TABLE redirects
  ADD CONSTRAINT redirects_code CHECK (status_code IN (301, 302, 307, 308)),
  ADD CONSTRAINT redirects_paths CHECK (
    from_path ~ '^/'
    AND to_path ~ '^/'
    AND from_path <> to_path
  );

ALTER TABLE enquiries
  ADD CONSTRAINT enquiries_reference CHECK (reference ~ '^ME-E-[0-9]{6}$'),
  ADD CONSTRAINT enquiries_party CHECK (adult_count >= 1 AND child_count >= 0),
  ADD CONSTRAINT enquiries_dates CHECK (
    travel_start IS NULL OR travel_end IS NULL OR travel_end >= travel_start
  ),
  ADD CONSTRAINT enquiries_budget CHECK (
    (budget_min IS NULL OR budget_min >= 0)
    AND (budget_max IS NULL OR budget_max >= 0)
    AND (
      budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min
    )
    AND (
      budget_min IS NULL AND budget_max IS NULL
      OR budget_currency IS NOT NULL
    )
  ),
  ADD CONSTRAINT enquiries_currency CHECK (
    budget_currency IS NULL OR budget_currency ~ '^[A-Z]{3}$'
  ),
  ADD CONSTRAINT enquiries_score CHECK (
    qualification_score IS NULL OR qualification_score BETWEEN 0 AND 100
  ),
  ADD CONSTRAINT enquiries_won CHECK (
    status <> 'WON' OR won_reference IS NOT NULL
  ),
  ADD CONSTRAINT enquiries_terminal CHECK (
    status NOT IN ('LOST', 'CLOSED') OR terminal_reason_code IS NOT NULL
  );

ALTER TABLE enquiry_travelers
  ADD CONSTRAINT travelers_age CHECK (
    (traveler_type = 'INFANT' AND age_at_arrival BETWEEN 0 AND 1)
    OR (traveler_type = 'CHILD' AND age_at_arrival BETWEEN 2 AND 11)
    OR (
      traveler_type = 'ADULT'
      AND (age_at_arrival IS NULL OR age_at_arrival >= 12)
    )
  );

ALTER TABLE quotes
  ADD CONSTRAINT quotes_reference CHECK (reference ~ '^ME-Q-[0-9]{6}$');

ALTER TABLE quote_versions
  ADD CONSTRAINT quote_versions_currency CHECK (currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT quote_versions_number CHECK (version_no >= 1),
  ADD CONSTRAINT quote_versions_amounts CHECK (
    subtotal >= 0
    AND tax_total >= 0
    AND fee_total >= 0
    AND discount_total >= 0
    AND grand_total >= 0
    AND grand_total = subtotal + tax_total + fee_total - discount_total
  ),
  ADD CONSTRAINT quote_versions_sent CHECK (
    (sent_at IS NULL AND status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'WITHDRAWN'))
    OR (sent_at IS NOT NULL AND status IN (
      'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED', 'WITHDRAWN'
    ))
  );

ALTER TABLE quote_items
  ADD CONSTRAINT quote_items_amounts CHECK (
    quantity > 0
    AND unit_amount >= 0
    AND tax_amount >= 0
    AND discount_amount >= 0
    AND line_total >= 0
    AND (
      (
        item_type = 'DISCOUNT'
        AND tax_amount = 0
        AND discount_amount = 0
        AND line_total = round(quantity * unit_amount, 2)
      )
      OR (
        item_type <> 'DISCOUNT'
        AND line_total = round(quantity * unit_amount + tax_amount - discount_amount, 2)
      )
    )
  );

ALTER TABLE itinerary_segments
  ADD CONSTRAINT segments_dates CHECK (end_date >= start_date),
  ADD CONSTRAINT segments_room_needs_resort CHECK (
    room_type_id IS NULL OR resort_id IS NOT NULL
  );

ALTER TABLE messages
  ADD CONSTRAINT messages_sender CHECK (
    (
      sender_type = 'STAFF'
      AND staff_sender_id IS NOT NULL
      AND customer_sender_id IS NULL
    )
    OR (
      sender_type = 'CUSTOMER'
      AND customer_sender_id IS NOT NULL
      AND staff_sender_id IS NULL
    )
  );

ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating CHECK (
    rating IS NULL OR rating BETWEEN 0 AND 5
  ),
  ADD CONSTRAINT reviews_publish CHECK (
    published_at IS NULL OR moderation_status = 'APPROVED'
  ),
  ADD CONSTRAINT reviews_featured CHECK (
    featured = false
    OR (
      moderation_status = 'APPROVED'
      AND published_at IS NOT NULL
      AND source_type <> 'IMPORTED'
    )
  );

ALTER TABLE homepage_modules
  ADD CONSTRAINT homepage_window CHECK (
    starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at
  );

ALTER TABLE sla_policies
  ADD CONSTRAINT sla_minutes CHECK (first_response_minutes > 0);

ALTER TABLE jobs
  ADD CONSTRAINT jobs_attempts CHECK (attempts >= 0);

CREATE OR REPLACE FUNCTION reject_vocabulary_set_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.set IS DISTINCT FROM OLD.set THEN
    RAISE EXCEPTION 'vocabulary set is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vocabulary_items_set_immutable
  BEFORE UPDATE ON vocabulary_items
  FOR EACH ROW
  EXECUTE FUNCTION reject_vocabulary_set_change();

CREATE OR REPLACE FUNCTION enforce_vocabulary_set()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item_id uuid;
  expected vocabulary_set;
BEGIN
  EXECUTE format('SELECT ($1).%I', TG_ARGV[0]) INTO item_id USING NEW;
  expected := TG_ARGV[1]::vocabulary_set;
  IF NOT vocabulary_item_in_set(item_id, expected) THEN
    RAISE EXCEPTION 'vocabulary item % must belong to set %', item_id, expected;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER resorts_price_band_set
  BEFORE INSERT OR UPDATE OF price_band_id ON resorts
  FOR EACH ROW EXECUTE FUNCTION enforce_vocabulary_set('price_band_id', 'PRICE_BAND');

CREATE TRIGGER room_types_category_set
  BEFORE INSERT OR UPDATE OF category_id ON room_types
  FOR EACH ROW EXECUTE FUNCTION enforce_vocabulary_set('category_id', 'ROOM_CATEGORY');

CREATE TRIGGER dining_venues_type_set
  BEFORE INSERT OR UPDATE OF venue_type_id ON dining_venues
  FOR EACH ROW EXECUTE FUNCTION enforce_vocabulary_set('venue_type_id', 'VENUE_TYPE');

CREATE TRIGGER dining_meal_plan_set
  BEFORE INSERT OR UPDATE OF meal_plan_id ON dining_venue_meal_plans
  FOR EACH ROW EXECUTE FUNCTION enforce_vocabulary_set('meal_plan_id', 'MEAL_PLAN');

CREATE TRIGGER transfer_type_set
  BEFORE INSERT OR UPDATE OF transfer_type_id ON transfer_options
  FOR EACH ROW EXECUTE FUNCTION enforce_vocabulary_set('transfer_type_id', 'TRANSFER_TYPE');

CREATE TRIGGER offers_meal_set
  BEFORE INSERT OR UPDATE OF meal_plan_id ON offers
  FOR EACH ROW EXECUTE FUNCTION enforce_vocabulary_set('meal_plan_id', 'MEAL_PLAN');

CREATE TRIGGER offers_occupancy_set
  BEFORE INSERT OR UPDATE OF occupancy_basis_id ON offers
  FOR EACH ROW EXECUTE FUNCTION enforce_vocabulary_set('occupancy_basis_id', 'OCCUPANCY_BASIS');

CREATE TRIGGER enquiries_trip_set
  BEFORE INSERT OR UPDATE OF trip_type_id ON enquiries
  FOR EACH ROW EXECUTE FUNCTION enforce_vocabulary_set('trip_type_id', 'TRIP_TYPE');

CREATE TRIGGER segments_meal_set
  BEFORE INSERT OR UPDATE OF meal_plan_id ON itinerary_segments
  FOR EACH ROW EXECUTE FUNCTION enforce_vocabulary_set('meal_plan_id', 'MEAL_PLAN');

CREATE OR REPLACE FUNCTION reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is insert-only', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER consent_records_insert_only
  BEFORE UPDATE OR DELETE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER audit_logs_insert_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER enquiry_status_history_insert_only
  BEFORE UPDATE OR DELETE ON enquiry_status_history
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER enquiry_assignments_insert_only
  BEFORE UPDATE OR DELETE ON enquiry_assignments
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE OR REPLACE FUNCTION freeze_submitted_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.submitted_snapshot IS DISTINCT FROM OLD.submitted_snapshot THEN
    RAISE EXCEPTION 'submitted_snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enquiries_snapshot_immutable
  BEFORE UPDATE ON enquiries
  FOR EACH ROW EXECUTE FUNCTION freeze_submitted_snapshot();

CREATE OR REPLACE FUNCTION offer_room_same_resort()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  room_resort uuid;
BEGIN
  IF NEW.room_type_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT resort_id INTO room_resort FROM room_types WHERE id = NEW.room_type_id;
  IF room_resort IS DISTINCT FROM NEW.resort_id THEN
    RAISE EXCEPTION 'offer room type must belong to the offer resort';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER offers_room_same_resort
  BEFORE INSERT OR UPDATE OF room_type_id, resort_id ON offers
  FOR EACH ROW EXECUTE FUNCTION offer_room_same_resort();

CREATE OR REPLACE FUNCTION segment_room_same_resort()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  room_resort uuid;
BEGIN
  IF NEW.room_type_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT resort_id INTO room_resort FROM room_types WHERE id = NEW.room_type_id;
  IF room_resort IS DISTINCT FROM NEW.resort_id THEN
    RAISE EXCEPTION 'segment room type must belong to the segment resort';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER segments_room_same_resort
  BEFORE INSERT OR UPDATE OF room_type_id, resort_id ON itinerary_segments
  FOR EACH ROW EXECUTE FUNCTION segment_room_same_resort();

CREATE OR REPLACE FUNCTION quote_active_version_same_quote()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent uuid;
BEGIN
  IF NEW.active_version_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT quote_id INTO parent FROM quote_versions WHERE id = NEW.active_version_id;
  IF parent IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'active version must belong to this quote';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER quotes_active_version_same_quote
  BEFORE INSERT OR UPDATE OF active_version_id ON quotes
  FOR EACH ROW EXECUTE FUNCTION quote_active_version_same_quote();

CREATE OR REPLACE FUNCTION quote_versions_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.sent_at IS NOT NULL THEN
      RAISE EXCEPTION 'sent quote versions cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.sent_at IS NOT NULL THEN
    IF NEW.quote_id IS DISTINCT FROM OLD.quote_id
      OR NEW.version_no IS DISTINCT FROM OLD.version_no
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
      OR NEW.tax_total IS DISTINCT FROM OLD.tax_total
      OR NEW.fee_total IS DISTINCT FROM OLD.fee_total
      OR NEW.discount_total IS DISTINCT FROM OLD.discount_total
      OR NEW.grand_total IS DISTINCT FROM OLD.grand_total
      OR NEW.terms_snapshot IS DISTINCT FROM OLD.terms_snapshot
      OR NEW.welcome_message IS DISTINCT FROM OLD.welcome_message
      OR NEW.overview IS DISTINCT FROM OLD.overview
      OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
      OR NEW.created_by_id IS DISTINCT FROM OLD.created_by_id
      OR NEW.approved_by_id IS DISTINCT FROM OLD.approved_by_id
      OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
      OR NEW.sent_at IS DISTINCT FROM OLD.sent_at
      OR NEW.pdf_media_id IS DISTINCT FROM OLD.pdf_media_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'sent quote versions are immutable except for status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER quote_versions_freeze
  BEFORE UPDATE OR DELETE ON quote_versions
  FOR EACH ROW EXECUTE FUNCTION quote_versions_immutable();

CREATE OR REPLACE FUNCTION quote_child_locked()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  sent timestamptz;
  version_id uuid;
BEGIN
  version_id := COALESCE(NEW.quote_version_id, OLD.quote_version_id);
  SELECT sent_at INTO sent FROM quote_versions WHERE id = version_id;
  IF sent IS NOT NULL THEN
    RAISE EXCEPTION 'lines on a sent quote version cannot change';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER quote_items_locked
  BEFORE INSERT OR UPDATE OR DELETE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION quote_child_locked();

CREATE TRIGGER itinerary_segments_locked
  BEFORE INSERT OR UPDATE OR DELETE ON itinerary_segments
  FOR EACH ROW EXECUTE FUNCTION quote_child_locked();

CREATE OR REPLACE FUNCTION content_category_no_cycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'category cannot parent itself';
  END IF;
  current := NEW.parent_id;
  WHILE current IS NOT NULL LOOP
    IF current = NEW.id THEN
      RAISE EXCEPTION 'category cycle';
    END IF;
    SELECT parent_id INTO current FROM content_categories WHERE id = current;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_categories_no_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON content_categories
  FOR EACH ROW EXECUTE FUNCTION content_category_no_cycle();

CREATE OR REPLACE FUNCTION enquiry_party_counts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target uuid;
  detail_children int;
  declared_children int;
BEGIN
  target := COALESCE(NEW.enquiry_id, OLD.enquiry_id);
  SELECT child_count INTO declared_children FROM enquiries WHERE id = target;
  SELECT count(*) INTO detail_children
  FROM enquiry_travelers
  WHERE enquiry_id = target
    AND traveler_type IN ('CHILD', 'INFANT');
  IF detail_children <> 0 AND detail_children <> declared_children THEN
    RAISE EXCEPTION 'child traveler rows must match child_count';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER enquiry_travelers_match_count
  AFTER INSERT OR UPDATE OR DELETE ON enquiry_travelers
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enquiry_party_counts();

CREATE OR REPLACE FUNCTION enquiry_party_counts_from_header()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  detail_children int;
BEGIN
  SELECT count(*) INTO detail_children
  FROM enquiry_travelers
  WHERE enquiry_id = NEW.id
    AND traveler_type IN ('CHILD', 'INFANT');
  IF detail_children <> 0 AND detail_children <> NEW.child_count THEN
    RAISE EXCEPTION 'child traveler rows must match child_count';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER enquiries_party_match_count
  AFTER UPDATE OF child_count ON enquiries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enquiry_party_counts_from_header();

CREATE OR REPLACE FUNCTION quote_totals_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target uuid;
  expected record;
  header quote_versions%ROWTYPE;
BEGIN
  target := COALESCE(NEW.quote_version_id, OLD.quote_version_id);
  SELECT * INTO header FROM quote_versions WHERE id = target;
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
  INTO expected
  FROM quote_items
  WHERE quote_version_id = target;

  IF header.subtotal <> expected.subtotal
    OR header.tax_total <> expected.tax_total
    OR header.fee_total <> expected.fee_total
    OR header.discount_total <> expected.discount_total
    OR header.grand_total <> (
      expected.subtotal + expected.tax_total + expected.fee_total - expected.discount_total
    )
  THEN
    RAISE EXCEPTION 'quote totals do not match lines';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER quote_items_match_header
  AFTER INSERT OR UPDATE OR DELETE ON quote_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION quote_totals_match();

CREATE OR REPLACE FUNCTION quote_totals_match_from_header()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected record;
BEGIN
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
  INTO expected
  FROM quote_items
  WHERE quote_version_id = NEW.id;

  IF NEW.subtotal <> expected.subtotal
    OR NEW.tax_total <> expected.tax_total
    OR NEW.fee_total <> expected.fee_total
    OR NEW.discount_total <> expected.discount_total
    OR NEW.grand_total <> (
      expected.subtotal + expected.tax_total + expected.fee_total - expected.discount_total
    )
  THEN
    RAISE EXCEPTION 'quote totals do not match lines';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER quote_versions_match_lines
  AFTER UPDATE OF subtotal, tax_total, fee_total, discount_total, grand_total
  ON quote_versions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION quote_totals_match_from_header();

CREATE OR REPLACE FUNCTION quote_response_owns_enquiry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owner uuid;
BEGIN
  SELECT e.customer_id INTO owner
  FROM quote_versions v
  JOIN quotes q ON q.id = v.quote_id
  JOIN enquiries e ON e.id = q.enquiry_id
  WHERE v.id = NEW.quote_version_id;

  IF owner IS DISTINCT FROM NEW.customer_id THEN
    RAISE EXCEPTION 'quote response customer must own the enquiry';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER quote_responses_own_enquiry
  BEFORE INSERT ON quote_responses
  FOR EACH ROW EXECUTE FUNCTION quote_response_owns_enquiry();

CREATE OR REPLACE FUNCTION message_customer_owns_enquiry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owner uuid;
BEGIN
  IF NEW.sender_type IS DISTINCT FROM 'CUSTOMER' THEN
    RETURN NEW;
  END IF;

  SELECT customer_id INTO owner FROM enquiries WHERE id = NEW.enquiry_id;
  IF owner IS DISTINCT FROM NEW.customer_sender_id THEN
    RAISE EXCEPTION 'customer message must belong to the enquiry customer';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_customer_owns_enquiry
  BEFORE INSERT OR UPDATE OF enquiry_id, sender_type, customer_sender_id ON messages
  FOR EACH ROW EXECUTE FUNCTION message_customer_owns_enquiry();

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- One active service policy.
CREATE UNIQUE INDEX ux_sla_policies_one_active
  ON sla_policies ((true))
  WHERE active;

-- One accept or decline per quote version. Clarifications stay unrestricted.
CREATE UNIQUE INDEX ux_quote_responses_one_terminal
  ON quote_responses (quote_version_id)
  WHERE response_type IN ('ACCEPT', 'DECLINE');

-- Public catalogs. Validity is applied in the query, not the predicate.
CREATE INDEX ix_resorts_published_rank
  ON resorts (popularity_rank, published_at DESC)
  WHERE status = 'PUBLISHED';

CREATE INDEX ix_offers_published_validity
  ON offers (valid_until, from_price)
  WHERE status = 'PUBLISHED';

CREATE INDEX ix_articles_published
  ON articles (published_at DESC)
  WHERE status = 'PUBLISHED';

CREATE INDEX ix_experiences_published
  ON experiences (published_at DESC)
  WHERE status = 'PUBLISHED';

-- Open operational queue.
CREATE INDEX ix_enquiries_open_queue
  ON enquiries (assigned_user_id, created_at)
  WHERE status NOT IN ('LOST', 'CLOSED');

-- Due work and pending jobs.
CREATE INDEX ix_tasks_open_due
  ON tasks (due_at)
  WHERE status IN ('OPEN', 'IN_PROGRESS');

CREATE INDEX ix_jobs_pending
  ON jobs (run_at)
  WHERE status = 'PENDING';

-- Spelling-tolerant name suggestions.
CREATE INDEX ix_resorts_name_trgm ON resorts USING gin (name gin_trgm_ops);
CREATE INDEX ix_offers_title_trgm ON offers USING gin (title gin_trgm_ops);
CREATE INDEX ix_islands_name_trgm ON islands USING gin (name gin_trgm_ops);
CREATE INDEX ix_atolls_name_trgm ON atolls USING gin (name gin_trgm_ops);
CREATE INDEX ix_experiences_name_trgm ON experiences USING gin (name gin_trgm_ops);
CREATE INDEX ix_articles_title_trgm ON articles USING gin (title gin_trgm_ops);

ALTER TABLE resorts ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(editorial_positioning, '')), 'C')
  ) STORED;

ALTER TABLE offers ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(terms, '')), 'C')
  ) STORED;

ALTER TABLE islands ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

ALTER TABLE atolls ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

ALTER TABLE experiences ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

ALTER TABLE articles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_plain, '')), 'C')
  ) STORED;

CREATE INDEX ix_resorts_search ON resorts USING gin (search_vector);
CREATE INDEX ix_offers_search ON offers USING gin (search_vector);
CREATE INDEX ix_islands_search ON islands USING gin (search_vector);
CREATE INDEX ix_atolls_search ON atolls USING gin (search_vector);
CREATE INDEX ix_experiences_search ON experiences USING gin (search_vector);
CREATE INDEX ix_articles_search ON articles USING gin (search_vector);

CREATE VIEW customer_visible_notes AS
SELECT id, enquiry_id, author_id, body, created_at
FROM notes
WHERE visibility = 'CUSTOMER';

CREATE SEQUENCE enquiry_reference_seq START 1;
CREATE SEQUENCE quote_reference_seq START 1;
