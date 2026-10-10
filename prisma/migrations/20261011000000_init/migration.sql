-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "public"."user_status" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."publish_status" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."island_type" AS ENUM ('RESORT', 'LOCAL', 'UNINHABITED');

-- CreateEnum
CREATE TYPE "public"."property_type" AS ENUM ('RESORT', 'GUESTHOUSE', 'LIVEABOARD');

-- CreateEnum
CREATE TYPE "public"."media_kind" AS ENUM ('IMAGE', 'VIDEO', 'DRONE', 'TOUR_360', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "public"."media_role" AS ENUM ('HERO', 'GALLERY', 'OG', 'PORTRAIT', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "public"."media_owner_type" AS ENUM ('RESORT', 'ROOM_TYPE', 'DINING_VENUE', 'ISLAND', 'ATOLL', 'EXPERIENCE', 'OFFER', 'ARTICLE', 'EXPERT', 'COLLECTION', 'AWARD');

-- CreateEnum
CREATE TYPE "public"."saved_entity_type" AS ENUM ('RESORT', 'OFFER', 'EXPERIENCE', 'ARTICLE');

-- CreateEnum
CREATE TYPE "public"."collection_entity_type" AS ENUM ('RESORT', 'OFFER', 'EXPERIENCE', 'ARTICLE', 'ISLAND', 'ATOLL');

-- CreateEnum
CREATE TYPE "public"."content_entity_type" AS ENUM ('RESORT', 'OFFER', 'EXPERIENCE', 'ARTICLE', 'ISLAND', 'ATOLL');

-- CreateEnum
CREATE TYPE "public"."faq_owner_type" AS ENUM ('GLOBAL', 'RESORT', 'ISLAND', 'ATOLL', 'EXPERIENCE', 'OFFER', 'ARTICLE');

-- CreateEnum
CREATE TYPE "public"."attachment_owner_type" AS ENUM ('ENQUIRY', 'QUOTE_VERSION', 'NOTE', 'MESSAGE');

-- CreateEnum
CREATE TYPE "public"."enquiry_status" AS ENUM ('NEW', 'CONTACT_ATTEMPTED', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'NEGOTIATION', 'WON', 'LOST', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."traveler_type" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "public"."task_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."note_visibility" AS ENUM ('INTERNAL', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "public"."comm_channel" AS ENUM ('EMAIL', 'PHONE', 'PORTAL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "public"."comm_direction" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "public"."quote_version_status" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "public"."quote_item_type" AS ENUM ('ACCOMMODATION', 'TRANSFER', 'EXPERIENCE', 'TAX', 'FEE', 'DISCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."quote_response_type" AS ENUM ('CLARIFICATION', 'ACCEPT', 'DECLINE');

-- CreateEnum
CREATE TYPE "public"."consent_purpose" AS ENUM ('ENQUIRY_CONTACT', 'ACCOUNT', 'NEWSLETTER', 'ANALYTICS', 'MARKETING');

-- CreateEnum
CREATE TYPE "public"."consent_status" AS ENUM ('GRANTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "public"."consent_subject_type" AS ENUM ('CUSTOMER', 'USER', 'SUBSCRIPTION', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "public"."subscription_status" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "public"."review_source" AS ENUM ('FIRST_PARTY', 'EDITORIAL', 'IMPORTED');

-- CreateEnum
CREATE TYPE "public"."verification_status" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."moderation_status" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."email_classification" AS ENUM ('TRANSACTIONAL', 'MARKETING');

-- CreateEnum
CREATE TYPE "public"."email_delivery_status" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "public"."job_status" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."mfa_type" AS ENUM ('TOTP');

-- CreateEnum
CREATE TYPE "public"."homepage_module_type" AS ENUM ('HERO', 'FEATURED_RESORTS', 'FEATURED_OFFERS', 'FEATURED_EXPERIENCES', 'FEATURED_GUIDES', 'DESTINATION_EXPLAINER', 'TRUST', 'TESTIMONIALS', 'NEWSLETTER', 'RECENTLY_VIEWED');

-- CreateEnum
CREATE TYPE "public"."vocabulary_set" AS ENUM ('MEAL_PLAN', 'TRANSFER_TYPE', 'OCCUPANCY_BASIS', 'PRICE_BAND', 'TRIP_TYPE', 'LOSS_REASON', 'CLOSURE_REASON', 'ROOM_CATEGORY', 'VENUE_TYPE');

-- CreateEnum
CREATE TYPE "public"."sender_type" AS ENUM ('CUSTOMER', 'STAFF');

-- CreateEnum
CREATE TYPE "public"."analytics_consent" AS ENUM ('GRANTED', 'DENIED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."block_type" AS ENUM ('RICH_TEXT', 'CALLOUT', 'FAQ_LIST', 'CTA', 'RELATED_ENTITIES', 'IMAGE_BAND');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "status" "public"."user_status" NOT NULL DEFAULT 'INVITED',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "public"."mfa_factors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "public"."mfa_type" NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "enabled_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."expert_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "years_in_tourism" INTEGER,
    "portrait_media_id" UUID,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "expert_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."atolls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "seo_title" TEXT,
    "seo_description" TEXT,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "atolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."islands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "atoll_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "island_type" "public"."island_type" NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "history" TEXT,
    "culture_notes" TEXT,
    "etiquette" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "seo_title" TEXT,
    "seo_description" TEXT,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "islands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."resorts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "island_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "property_type" "public"."property_type" NOT NULL DEFAULT 'RESORT',
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "editorial_positioning" TEXT,
    "price_band_id" UUID,
    "indicative_from_price" DECIMAL(12,2),
    "indicative_currency" CHAR(3),
    "price_basis" TEXT,
    "price_includes_transfer" BOOLEAN,
    "price_includes_tax" BOOLEAN,
    "price_source_note" TEXT,
    "price_reviewed_at" TIMESTAMPTZ(6),
    "popularity_rank" INTEGER NOT NULL DEFAULT 0,
    "star_category" INTEGER,
    "star_category_source" TEXT,
    "has_house_reef" BOOLEAN,
    "reef_summary" TEXT,
    "dive_center_summary" TEXT,
    "reef_source_note" TEXT,
    "reef_reviewed_at" TIMESTAMPTZ(6),
    "check_in_notes" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "resorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."room_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resort_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "max_adults" INTEGER NOT NULL,
    "max_children" INTEGER NOT NULL DEFAULT 0,
    "size_sqm" DECIMAL(8,2),
    "features" TEXT,
    "indicative_from_price" DECIMAL(12,2),
    "indicative_currency" CHAR(3),
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dining_venues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resort_id" UUID NOT NULL,
    "venue_type_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cuisine" TEXT,
    "description" TEXT NOT NULL,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "dining_venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dining_venue_meal_plans" (
    "dining_venue_id" UUID NOT NULL,
    "meal_plan_id" UUID NOT NULL,

    CONSTRAINT "dining_venue_meal_plans_pkey" PRIMARY KEY ("dining_venue_id","meal_plan_id")
);

-- CreateTable
CREATE TABLE "public"."transfer_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resort_id" UUID NOT NULL,
    "transfer_type_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "duration_minutes" INTEGER,
    "duration_basis" TEXT,
    "source_note" TEXT,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transfer_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."amenities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."resort_amenities" (
    "resort_id" UUID NOT NULL,
    "amenity_id" UUID NOT NULL,

    CONSTRAINT "resort_amenities_pkey" PRIMARY KEY ("resort_id","amenity_id")
);

-- CreateTable
CREATE TABLE "public"."audience_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "audience_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."resort_audiences" (
    "resort_id" UUID NOT NULL,
    "audience_tag_id" UUID NOT NULL,

    CONSTRAINT "resort_audiences_pkey" PRIMARY KEY ("resort_id","audience_tag_id")
);

-- CreateTable
CREATE TABLE "public"."experience_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "experience_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "seasonality" TEXT,
    "season_source_note" TEXT,
    "season_reviewed_at" TIMESTAMPTZ(6),
    "suitability" TEXT,
    "duration_guidance" TEXT,
    "difficulty" TEXT,
    "safety_notes" TEXT,
    "environmental_notes" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."resort_experiences" (
    "resort_id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "notes" TEXT,

    CONSTRAINT "resort_experiences_pkey" PRIMARY KEY ("resort_id","experience_id")
);

-- CreateTable
CREATE TABLE "public"."island_experiences" (
    "island_id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,

    CONSTRAINT "island_experiences_pkey" PRIMARY KEY ("island_id","experience_id")
);

-- CreateTable
CREATE TABLE "public"."offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resort_id" UUID NOT NULL,
    "room_type_id" UUID,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "from_price" DECIMAL(12,2) NOT NULL,
    "comparison_price" DECIMAL(12,2),
    "comparison_basis_note" TEXT,
    "occupancy_basis_id" UUID NOT NULL,
    "meal_plan_id" UUID NOT NULL,
    "transfer_included" BOOLEAN NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE NOT NULL,
    "stay_from" DATE,
    "stay_until" DATE,
    "min_nights" INTEGER,
    "terms" TEXT NOT NULL,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."offer_inclusions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "offer_inclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."offer_exclusions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "offer_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."offer_audiences" (
    "offer_id" UUID NOT NULL,
    "audience_tag_id" UUID NOT NULL,

    CONSTRAINT "offer_audiences_pkey" PRIMARY KEY ("offer_id","audience_tag_id")
);

-- CreateTable
CREATE TABLE "public"."collections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."collection_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collection_id" UUID NOT NULL,
    "entity_type" "public"."collection_entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "content_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "body_plain" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "stale_after" DATE,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "seo_title" TEXT,
    "seo_description" TEXT,
    "og_media_id" UUID,
    "canonical_path" TEXT,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."article_tags" (
    "article_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "article_tags_pkey" PRIMARY KEY ("article_id","tag_id")
);

-- CreateTable
CREATE TABLE "public"."content_relations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "entity_type" "public"."content_entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "content_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."faqs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_type" "public"."faq_owner_type" NOT NULL,
    "owner_id" UUID,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."homepage_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_type" "public"."homepage_module_type" NOT NULL,
    "title" TEXT,
    "config" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "homepage_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reusable_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "block_type" "public"."block_type" NOT NULL,
    "body" JSONB NOT NULL,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "reusable_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" INTEGER,
    "alt_text" TEXT,
    "caption" TEXT,
    "transcript" TEXT,
    "attribution" TEXT,
    "focal_point" JSONB,
    "kind" "public"."media_kind" NOT NULL,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."media_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "media_id" UUID NOT NULL,
    "owner_type" "public"."media_owner_type" NOT NULL,
    "owner_id" UUID NOT NULL,
    "role" "public"."media_role" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "media_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."redirects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_path" TEXT NOT NULL,
    "to_path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 301,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."awards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "source_url" TEXT NOT NULL,
    "resort_id" UUID,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "unpublished_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" TEXT,
    "country_code" CHAR(2),
    "locale" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consent_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_type" "public"."consent_subject_type" NOT NULL,
    "subject_id" UUID NOT NULL,
    "purpose" "public"."consent_purpose" NOT NULL,
    "status" "public"."consent_status" NOT NULL,
    "notice_version" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMPTZ(6),
    "ip_hash" TEXT,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."saved_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "entity_type" "public"."saved_entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "status" "public"."subscription_status" NOT NULL DEFAULT 'PENDING',
    "preferences" JSONB NOT NULL,
    "consent_record_id" UUID NOT NULL,
    "confirm_token_hash" TEXT,
    "subscribed_at" TIMESTAMPTZ(6),
    "unsubscribed_at" TIMESTAMPTZ(6),
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enquiries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" "public"."enquiry_status" NOT NULL DEFAULT 'NEW',
    "assigned_user_id" UUID,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "referrer" TEXT,
    "landing_path" TEXT,
    "travel_start" DATE,
    "travel_end" DATE,
    "flexibility" TEXT,
    "adult_count" INTEGER NOT NULL,
    "child_count" INTEGER NOT NULL DEFAULT 0,
    "budget_min" DECIMAL(12,2),
    "budget_max" DECIMAL(12,2),
    "budget_currency" CHAR(3),
    "trip_type_id" UUID,
    "requirements" TEXT,
    "accessibility_needs" TEXT,
    "qualification_score" INTEGER,
    "first_response_at" TIMESTAMPTZ(6),
    "won_reference" TEXT,
    "terminal_reason_code" TEXT,
    "submitted_snapshot" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enquiry_travelers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enquiry_id" UUID NOT NULL,
    "traveler_type" "public"."traveler_type" NOT NULL,
    "age_at_arrival" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "enquiry_travelers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enquiry_resorts" (
    "enquiry_id" UUID NOT NULL,
    "resort_id" UUID NOT NULL,

    CONSTRAINT "enquiry_resorts_pkey" PRIMARY KEY ("enquiry_id","resort_id")
);

-- CreateTable
CREATE TABLE "public"."enquiry_offers" (
    "enquiry_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,

    CONSTRAINT "enquiry_offers_pkey" PRIMARY KEY ("enquiry_id","offer_id")
);

-- CreateTable
CREATE TABLE "public"."enquiry_interests" (
    "enquiry_id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,

    CONSTRAINT "enquiry_interests_pkey" PRIMARY KEY ("enquiry_id","experience_id")
);

-- CreateTable
CREATE TABLE "public"."enquiry_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enquiry_id" UUID NOT NULL,
    "from_status" "public"."enquiry_status",
    "to_status" "public"."enquiry_status" NOT NULL,
    "reason_code" TEXT,
    "note" TEXT,
    "changed_by_id" UUID,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enquiry_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enquiry_id" UUID NOT NULL,
    "from_user_id" UUID,
    "to_user_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "assigned_by_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enquiry_id" UUID NOT NULL,
    "assignee_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "due_at" TIMESTAMPTZ(6),
    "status" "public"."task_status" NOT NULL DEFAULT 'OPEN',
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enquiry_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "visibility" "public"."note_visibility" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."communication_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enquiry_id" UUID NOT NULL,
    "channel" "public"."comm_channel" NOT NULL,
    "direction" "public"."comm_direction" NOT NULL,
    "subject" TEXT,
    "summary" TEXT NOT NULL,
    "provider_reference" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "logged_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_type" "public"."attachment_owner_type" NOT NULL,
    "owner_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enquiry_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "active_version_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_total" DECIMAL(12,2) NOT NULL,
    "fee_total" DECIMAL(12,2) NOT NULL,
    "discount_total" DECIMAL(12,2) NOT NULL,
    "grand_total" DECIMAL(12,2) NOT NULL,
    "terms_snapshot" TEXT NOT NULL,
    "welcome_message" TEXT,
    "overview" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "public"."quote_version_status" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "pdf_media_id" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quote_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."itinerary_segments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_version_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "resort_id" UUID,
    "room_type_id" UUID,
    "meal_plan_id" UUID,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "transfer_summary" TEXT,
    "notes" TEXT,

    CONSTRAINT "itinerary_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_version_id" UUID NOT NULL,
    "item_type" "public"."quote_item_type" NOT NULL,
    "experience_id" UUID,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_version_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "response_type" "public"."quote_response_type" NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enquiry_id" UUID NOT NULL,
    "sender_type" "public"."sender_type" NOT NULL,
    "staff_sender_id" UUID,
    "customer_sender_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "classification" "public"."email_classification" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."publish_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID,
    "template_code" TEXT NOT NULL,
    "to_email" CITEXT NOT NULL,
    "classification" "public"."email_classification" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "provider_id" TEXT,
    "status" "public"."email_delivery_status" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "related_type" TEXT,
    "related_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resort_id" UUID,
    "source_type" "public"."review_source" NOT NULL,
    "source_reference" TEXT,
    "display_name" TEXT NOT NULL,
    "rating" DECIMAL(2,1),
    "rating_basis" TEXT,
    "body" TEXT NOT NULL,
    "verification_status" "public"."verification_status" NOT NULL DEFAULT 'UNVERIFIED',
    "consent_status" "public"."consent_status" NOT NULL,
    "moderation_status" "public"."moderation_status" NOT NULL DEFAULT 'PENDING',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "correlation_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analytics_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_name" TEXT NOT NULL,
    "anonymous_key" TEXT,
    "user_id" UUID,
    "properties" JSONB NOT NULL,
    "consent_state" "public"."analytics_consent" NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."idempotency_keys" (
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_code" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."vocabulary_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "set" "public"."vocabulary_set" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vocabulary_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "owner" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "retires_on" DATE,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "public"."job_status" NOT NULL DEFAULT 'PENDING',
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "locked_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sla_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "first_response_minutes" INTEGER NOT NULL,
    "business_hours" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "public"."roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "public"."permissions"("code");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "public"."role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "public"."user_roles"("role_id");

-- CreateIndex
CREATE INDEX "user_roles_assigned_by_id_idx" ON "public"."user_roles"("assigned_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_factors_user_id_type_key" ON "public"."mfa_factors"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "public"."sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "public"."sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_idx" ON "public"."sessions"("expires");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "public"."accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "public"."accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "public"."verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "expert_profiles_user_id_key" ON "public"."expert_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_profiles_slug_key" ON "public"."expert_profiles"("slug");

-- CreateIndex
CREATE INDEX "expert_profiles_status_idx" ON "public"."expert_profiles"("status");

-- CreateIndex
CREATE INDEX "expert_profiles_portrait_media_id_idx" ON "public"."expert_profiles"("portrait_media_id");

-- CreateIndex
CREATE INDEX "expert_profiles_created_by_id_idx" ON "public"."expert_profiles"("created_by_id");

-- CreateIndex
CREATE INDEX "expert_profiles_updated_by_id_idx" ON "public"."expert_profiles"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "atolls_slug_key" ON "public"."atolls"("slug");

-- CreateIndex
CREATE INDEX "atolls_status_published_at_idx" ON "public"."atolls"("status", "published_at");

-- CreateIndex
CREATE INDEX "atolls_created_by_id_idx" ON "public"."atolls"("created_by_id");

-- CreateIndex
CREATE INDEX "atolls_updated_by_id_idx" ON "public"."atolls"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "islands_slug_key" ON "public"."islands"("slug");

-- CreateIndex
CREATE INDEX "islands_atoll_id_status_idx" ON "public"."islands"("atoll_id", "status");

-- CreateIndex
CREATE INDEX "islands_island_type_idx" ON "public"."islands"("island_type");

-- CreateIndex
CREATE INDEX "islands_created_by_id_idx" ON "public"."islands"("created_by_id");

-- CreateIndex
CREATE INDEX "islands_updated_by_id_idx" ON "public"."islands"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "resorts_slug_key" ON "public"."resorts"("slug");

-- CreateIndex
CREATE INDEX "resorts_island_id_status_idx" ON "public"."resorts"("island_id", "status");

-- CreateIndex
CREATE INDEX "resorts_status_popularity_rank_idx" ON "public"."resorts"("status", "popularity_rank");

-- CreateIndex
CREATE INDEX "resorts_property_type_status_idx" ON "public"."resorts"("property_type", "status");

-- CreateIndex
CREATE INDEX "resorts_price_band_id_idx" ON "public"."resorts"("price_band_id");

-- CreateIndex
CREATE INDEX "resorts_created_by_id_idx" ON "public"."resorts"("created_by_id");

-- CreateIndex
CREATE INDEX "resorts_updated_by_id_idx" ON "public"."resorts"("updated_by_id");

-- CreateIndex
CREATE INDEX "room_types_category_id_idx" ON "public"."room_types"("category_id");

-- CreateIndex
CREATE INDEX "room_types_resort_id_status_sort_order_idx" ON "public"."room_types"("resort_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "room_types_created_by_id_idx" ON "public"."room_types"("created_by_id");

-- CreateIndex
CREATE INDEX "room_types_updated_by_id_idx" ON "public"."room_types"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_resort_id_slug_key" ON "public"."room_types"("resort_id", "slug");

-- CreateIndex
CREATE INDEX "dining_venues_resort_id_status_sort_order_idx" ON "public"."dining_venues"("resort_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "dining_venues_venue_type_id_idx" ON "public"."dining_venues"("venue_type_id");

-- CreateIndex
CREATE INDEX "dining_venues_created_by_id_idx" ON "public"."dining_venues"("created_by_id");

-- CreateIndex
CREATE INDEX "dining_venues_updated_by_id_idx" ON "public"."dining_venues"("updated_by_id");

-- CreateIndex
CREATE INDEX "dining_venue_meal_plans_meal_plan_id_idx" ON "public"."dining_venue_meal_plans"("meal_plan_id");

-- CreateIndex
CREATE INDEX "transfer_options_resort_id_sort_order_idx" ON "public"."transfer_options"("resort_id", "sort_order");

-- CreateIndex
CREATE INDEX "transfer_options_transfer_type_id_idx" ON "public"."transfer_options"("transfer_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_code_key" ON "public"."amenities"("code");

-- CreateIndex
CREATE INDEX "amenities_category_idx" ON "public"."amenities"("category");

-- CreateIndex
CREATE INDEX "resort_amenities_amenity_id_idx" ON "public"."resort_amenities"("amenity_id");

-- CreateIndex
CREATE UNIQUE INDEX "audience_tags_code_key" ON "public"."audience_tags"("code");

-- CreateIndex
CREATE INDEX "resort_audiences_audience_tag_id_idx" ON "public"."resort_audiences"("audience_tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "experience_categories_slug_key" ON "public"."experience_categories"("slug");

-- CreateIndex
CREATE INDEX "experience_categories_status_sort_order_idx" ON "public"."experience_categories"("status", "sort_order");

-- CreateIndex
CREATE INDEX "experience_categories_created_by_id_idx" ON "public"."experience_categories"("created_by_id");

-- CreateIndex
CREATE INDEX "experience_categories_updated_by_id_idx" ON "public"."experience_categories"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "experiences_slug_key" ON "public"."experiences"("slug");

-- CreateIndex
CREATE INDEX "experiences_category_id_status_idx" ON "public"."experiences"("category_id", "status");

-- CreateIndex
CREATE INDEX "experiences_status_published_at_idx" ON "public"."experiences"("status", "published_at");

-- CreateIndex
CREATE INDEX "experiences_created_by_id_idx" ON "public"."experiences"("created_by_id");

-- CreateIndex
CREATE INDEX "experiences_updated_by_id_idx" ON "public"."experiences"("updated_by_id");

-- CreateIndex
CREATE INDEX "resort_experiences_experience_id_idx" ON "public"."resort_experiences"("experience_id");

-- CreateIndex
CREATE INDEX "island_experiences_experience_id_idx" ON "public"."island_experiences"("experience_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_slug_key" ON "public"."offers"("slug");

-- CreateIndex
CREATE INDEX "offers_resort_id_status_idx" ON "public"."offers"("resort_id", "status");

-- CreateIndex
CREATE INDEX "offers_room_type_id_idx" ON "public"."offers"("room_type_id");

-- CreateIndex
CREATE INDEX "offers_status_valid_until_idx" ON "public"."offers"("status", "valid_until");

-- CreateIndex
CREATE INDEX "offers_occupancy_basis_id_idx" ON "public"."offers"("occupancy_basis_id");

-- CreateIndex
CREATE INDEX "offers_meal_plan_id_idx" ON "public"."offers"("meal_plan_id");

-- CreateIndex
CREATE INDEX "offers_created_by_id_idx" ON "public"."offers"("created_by_id");

-- CreateIndex
CREATE INDEX "offers_updated_by_id_idx" ON "public"."offers"("updated_by_id");

-- CreateIndex
CREATE INDEX "offer_inclusions_offer_id_sort_order_idx" ON "public"."offer_inclusions"("offer_id", "sort_order");

-- CreateIndex
CREATE INDEX "offer_exclusions_offer_id_sort_order_idx" ON "public"."offer_exclusions"("offer_id", "sort_order");

-- CreateIndex
CREATE INDEX "offer_audiences_audience_tag_id_idx" ON "public"."offer_audiences"("audience_tag_id");

-- CreateIndex
CREATE INDEX "collections_status_published_at_idx" ON "public"."collections"("status", "published_at");

-- CreateIndex
CREATE INDEX "collections_created_by_id_idx" ON "public"."collections"("created_by_id");

-- CreateIndex
CREATE INDEX "collections_updated_by_id_idx" ON "public"."collections"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "collections_locale_slug_key" ON "public"."collections"("locale", "slug");

-- CreateIndex
CREATE INDEX "collection_items_entity_type_entity_id_idx" ON "public"."collection_items"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "collection_items_collection_id_sort_order_idx" ON "public"."collection_items"("collection_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_collection_id_entity_type_entity_id_key" ON "public"."collection_items"("collection_id", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_categories_slug_key" ON "public"."content_categories"("slug");

-- CreateIndex
CREATE INDEX "content_categories_parent_id_idx" ON "public"."content_categories"("parent_id");

-- CreateIndex
CREATE INDEX "content_categories_created_by_id_idx" ON "public"."content_categories"("created_by_id");

-- CreateIndex
CREATE INDEX "content_categories_updated_by_id_idx" ON "public"."content_categories"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "public"."tags"("slug");

-- CreateIndex
CREATE INDEX "articles_category_id_status_idx" ON "public"."articles"("category_id", "status");

-- CreateIndex
CREATE INDEX "articles_author_id_idx" ON "public"."articles"("author_id");

-- CreateIndex
CREATE INDEX "articles_reviewer_id_idx" ON "public"."articles"("reviewer_id");

-- CreateIndex
CREATE INDEX "articles_status_published_at_idx" ON "public"."articles"("status", "published_at");

-- CreateIndex
CREATE INDEX "articles_stale_after_idx" ON "public"."articles"("stale_after");

-- CreateIndex
CREATE INDEX "articles_og_media_id_idx" ON "public"."articles"("og_media_id");

-- CreateIndex
CREATE INDEX "articles_created_by_id_idx" ON "public"."articles"("created_by_id");

-- CreateIndex
CREATE INDEX "articles_updated_by_id_idx" ON "public"."articles"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_locale_slug_key" ON "public"."articles"("locale", "slug");

-- CreateIndex
CREATE INDEX "article_tags_tag_id_idx" ON "public"."article_tags"("tag_id");

-- CreateIndex
CREATE INDEX "content_relations_entity_type_entity_id_idx" ON "public"."content_relations"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_relations_article_id_entity_type_entity_id_key" ON "public"."content_relations"("article_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "faqs_owner_type_owner_id_status_sort_order_idx" ON "public"."faqs"("owner_type", "owner_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "faqs_created_by_id_idx" ON "public"."faqs"("created_by_id");

-- CreateIndex
CREATE INDEX "faqs_updated_by_id_idx" ON "public"."faqs"("updated_by_id");

-- CreateIndex
CREATE INDEX "homepage_modules_status_sort_order_idx" ON "public"."homepage_modules"("status", "sort_order");

-- CreateIndex
CREATE INDEX "homepage_modules_created_by_id_idx" ON "public"."homepage_modules"("created_by_id");

-- CreateIndex
CREATE INDEX "homepage_modules_updated_by_id_idx" ON "public"."homepage_modules"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "reusable_blocks_code_key" ON "public"."reusable_blocks"("code");

-- CreateIndex
CREATE INDEX "reusable_blocks_status_idx" ON "public"."reusable_blocks"("status");

-- CreateIndex
CREATE INDEX "reusable_blocks_created_by_id_idx" ON "public"."reusable_blocks"("created_by_id");

-- CreateIndex
CREATE INDEX "reusable_blocks_updated_by_id_idx" ON "public"."reusable_blocks"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "public"."media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_kind_status_idx" ON "public"."media_assets"("kind", "status");

-- CreateIndex
CREATE INDEX "media_assets_created_by_id_idx" ON "public"."media_assets"("created_by_id");

-- CreateIndex
CREATE INDEX "media_links_owner_type_owner_id_role_sort_order_idx" ON "public"."media_links"("owner_type", "owner_id", "role", "sort_order");

-- CreateIndex
CREATE INDEX "media_links_media_id_idx" ON "public"."media_links"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "redirects_from_path_key" ON "public"."redirects"("from_path");

-- CreateIndex
CREATE INDEX "redirects_active_idx" ON "public"."redirects"("active");

-- CreateIndex
CREATE INDEX "awards_resort_id_status_idx" ON "public"."awards"("resort_id", "status");

-- CreateIndex
CREATE INDEX "awards_created_by_id_idx" ON "public"."awards"("created_by_id");

-- CreateIndex
CREATE INDEX "awards_updated_by_id_idx" ON "public"."awards"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "public"."customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "public"."customers"("email");

-- CreateIndex
CREATE INDEX "consent_records_subject_type_subject_id_purpose_captured_at_idx" ON "public"."consent_records"("subject_type", "subject_id", "purpose", "captured_at");

-- CreateIndex
CREATE INDEX "saved_items_entity_type_entity_id_idx" ON "public"."saved_items"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_items_customer_id_entity_type_entity_id_key" ON "public"."saved_items"("customer_id", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_email_key" ON "public"."subscriptions"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_confirm_token_hash_key" ON "public"."subscriptions"("confirm_token_hash");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_consent_record_id_idx" ON "public"."subscriptions"("consent_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "enquiries_reference_key" ON "public"."enquiries"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "enquiries_idempotency_key_key" ON "public"."enquiries"("idempotency_key");

-- CreateIndex
CREATE INDEX "enquiries_customer_id_created_at_idx" ON "public"."enquiries"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "enquiries_assigned_user_id_status_created_at_idx" ON "public"."enquiries"("assigned_user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "enquiries_status_created_at_idx" ON "public"."enquiries"("status", "created_at");

-- CreateIndex
CREATE INDEX "enquiries_trip_type_id_idx" ON "public"."enquiries"("trip_type_id");

-- CreateIndex
CREATE INDEX "enquiry_travelers_enquiry_id_sort_order_idx" ON "public"."enquiry_travelers"("enquiry_id", "sort_order");

-- CreateIndex
CREATE INDEX "enquiry_resorts_resort_id_idx" ON "public"."enquiry_resorts"("resort_id");

-- CreateIndex
CREATE INDEX "enquiry_offers_offer_id_idx" ON "public"."enquiry_offers"("offer_id");

-- CreateIndex
CREATE INDEX "enquiry_interests_experience_id_idx" ON "public"."enquiry_interests"("experience_id");

-- CreateIndex
CREATE INDEX "enquiry_status_history_enquiry_id_changed_at_idx" ON "public"."enquiry_status_history"("enquiry_id", "changed_at");

-- CreateIndex
CREATE INDEX "enquiry_status_history_changed_by_id_idx" ON "public"."enquiry_status_history"("changed_by_id");

-- CreateIndex
CREATE INDEX "enquiry_assignments_enquiry_id_assigned_at_idx" ON "public"."enquiry_assignments"("enquiry_id", "assigned_at");

-- CreateIndex
CREATE INDEX "enquiry_assignments_to_user_id_idx" ON "public"."enquiry_assignments"("to_user_id");

-- CreateIndex
CREATE INDEX "enquiry_assignments_from_user_id_idx" ON "public"."enquiry_assignments"("from_user_id");

-- CreateIndex
CREATE INDEX "enquiry_assignments_assigned_by_id_idx" ON "public"."enquiry_assignments"("assigned_by_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_status_due_at_idx" ON "public"."tasks"("assignee_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "tasks_enquiry_id_status_idx" ON "public"."tasks"("enquiry_id", "status");

-- CreateIndex
CREATE INDEX "notes_enquiry_id_visibility_created_at_idx" ON "public"."notes"("enquiry_id", "visibility", "created_at");

-- CreateIndex
CREATE INDEX "notes_author_id_idx" ON "public"."notes"("author_id");

-- CreateIndex
CREATE INDEX "communication_logs_enquiry_id_occurred_at_idx" ON "public"."communication_logs"("enquiry_id", "occurred_at");

-- CreateIndex
CREATE INDEX "communication_logs_logged_by_id_idx" ON "public"."communication_logs"("logged_by_id");

-- CreateIndex
CREATE INDEX "attachments_owner_type_owner_id_idx" ON "public"."attachments"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "attachments_media_id_idx" ON "public"."attachments"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_reference_key" ON "public"."quotes"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_active_version_id_key" ON "public"."quotes"("active_version_id");

-- CreateIndex
CREATE INDEX "quotes_enquiry_id_idx" ON "public"."quotes"("enquiry_id");

-- CreateIndex
CREATE INDEX "quote_versions_status_expires_at_idx" ON "public"."quote_versions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "quote_versions_created_by_id_idx" ON "public"."quote_versions"("created_by_id");

-- CreateIndex
CREATE INDEX "quote_versions_approved_by_id_idx" ON "public"."quote_versions"("approved_by_id");

-- CreateIndex
CREATE INDEX "quote_versions_pdf_media_id_idx" ON "public"."quote_versions"("pdf_media_id");

-- CreateIndex
CREATE UNIQUE INDEX "quote_versions_quote_id_version_no_key" ON "public"."quote_versions"("quote_id", "version_no");

-- CreateIndex
CREATE INDEX "itinerary_segments_resort_id_idx" ON "public"."itinerary_segments"("resort_id");

-- CreateIndex
CREATE INDEX "itinerary_segments_room_type_id_idx" ON "public"."itinerary_segments"("room_type_id");

-- CreateIndex
CREATE INDEX "itinerary_segments_meal_plan_id_idx" ON "public"."itinerary_segments"("meal_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_segments_quote_version_id_sort_order_key" ON "public"."itinerary_segments"("quote_version_id", "sort_order");

-- CreateIndex
CREATE INDEX "quote_items_quote_version_id_sort_order_idx" ON "public"."quote_items"("quote_version_id", "sort_order");

-- CreateIndex
CREATE INDEX "quote_items_experience_id_idx" ON "public"."quote_items"("experience_id");

-- CreateIndex
CREATE INDEX "quote_responses_quote_version_id_created_at_idx" ON "public"."quote_responses"("quote_version_id", "created_at");

-- CreateIndex
CREATE INDEX "quote_responses_customer_id_idx" ON "public"."quote_responses"("customer_id");

-- CreateIndex
CREATE INDEX "messages_enquiry_id_created_at_idx" ON "public"."messages"("enquiry_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_staff_sender_id_idx" ON "public"."messages"("staff_sender_id");

-- CreateIndex
CREATE INDEX "messages_customer_sender_id_idx" ON "public"."messages"("customer_sender_id");

-- CreateIndex
CREATE INDEX "email_templates_code_locale_status_idx" ON "public"."email_templates"("code", "locale", "status");

-- CreateIndex
CREATE INDEX "email_templates_created_by_id_idx" ON "public"."email_templates"("created_by_id");

-- CreateIndex
CREATE INDEX "email_templates_updated_by_id_idx" ON "public"."email_templates"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_code_locale_version_key" ON "public"."email_templates"("code", "locale", "version");

-- CreateIndex
CREATE UNIQUE INDEX "email_deliveries_idempotency_key_key" ON "public"."email_deliveries"("idempotency_key");

-- CreateIndex
CREATE INDEX "email_deliveries_template_id_idx" ON "public"."email_deliveries"("template_id");

-- CreateIndex
CREATE INDEX "email_deliveries_status_created_at_idx" ON "public"."email_deliveries"("status", "created_at");

-- CreateIndex
CREATE INDEX "email_deliveries_related_type_related_id_idx" ON "public"."email_deliveries"("related_type", "related_id");

-- CreateIndex
CREATE INDEX "email_deliveries_to_email_idx" ON "public"."email_deliveries"("to_email");

-- CreateIndex
CREATE INDEX "reviews_resort_id_moderation_status_published_at_idx" ON "public"."reviews"("resort_id", "moderation_status", "published_at");

-- CreateIndex
CREATE INDEX "reviews_featured_published_at_idx" ON "public"."reviews"("featured", "published_at");

-- CreateIndex
CREATE INDEX "reviews_source_type_idx" ON "public"."reviews"("source_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_occurred_at_idx" ON "public"."audit_logs"("entity_type", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_occurred_at_idx" ON "public"."audit_logs"("actor_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_occurred_at_idx" ON "public"."audit_logs"("occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_correlation_id_idx" ON "public"."audit_logs"("correlation_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_name_occurred_at_idx" ON "public"."analytics_events"("event_name", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_anonymous_key_occurred_at_idx" ON "public"."analytics_events"("anonymous_key", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_occurred_at_idx" ON "public"."analytics_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "public"."idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "system_settings_updated_by_id_idx" ON "public"."system_settings"("updated_by_id");

-- CreateIndex
CREATE INDEX "vocabulary_items_set_active_sort_order_idx" ON "public"."vocabulary_items"("set", "active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_items_set_code_key" ON "public"."vocabulary_items"("set", "code");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_idempotency_key_key" ON "public"."jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "jobs_status_run_at_idx" ON "public"."jobs"("status", "run_at");

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expert_profiles" ADD CONSTRAINT "expert_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expert_profiles" ADD CONSTRAINT "expert_profiles_portrait_media_id_fkey" FOREIGN KEY ("portrait_media_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expert_profiles" ADD CONSTRAINT "expert_profiles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expert_profiles" ADD CONSTRAINT "expert_profiles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."atolls" ADD CONSTRAINT "atolls_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."atolls" ADD CONSTRAINT "atolls_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."islands" ADD CONSTRAINT "islands_atoll_id_fkey" FOREIGN KEY ("atoll_id") REFERENCES "public"."atolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."islands" ADD CONSTRAINT "islands_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."islands" ADD CONSTRAINT "islands_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resorts" ADD CONSTRAINT "resorts_island_id_fkey" FOREIGN KEY ("island_id") REFERENCES "public"."islands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resorts" ADD CONSTRAINT "resorts_price_band_id_fkey" FOREIGN KEY ("price_band_id") REFERENCES "public"."vocabulary_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resorts" ADD CONSTRAINT "resorts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resorts" ADD CONSTRAINT "resorts_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_types" ADD CONSTRAINT "room_types_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_types" ADD CONSTRAINT "room_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."vocabulary_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_types" ADD CONSTRAINT "room_types_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_types" ADD CONSTRAINT "room_types_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dining_venues" ADD CONSTRAINT "dining_venues_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dining_venues" ADD CONSTRAINT "dining_venues_venue_type_id_fkey" FOREIGN KEY ("venue_type_id") REFERENCES "public"."vocabulary_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dining_venues" ADD CONSTRAINT "dining_venues_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dining_venues" ADD CONSTRAINT "dining_venues_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dining_venue_meal_plans" ADD CONSTRAINT "dining_venue_meal_plans_dining_venue_id_fkey" FOREIGN KEY ("dining_venue_id") REFERENCES "public"."dining_venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dining_venue_meal_plans" ADD CONSTRAINT "dining_venue_meal_plans_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."vocabulary_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transfer_options" ADD CONSTRAINT "transfer_options_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transfer_options" ADD CONSTRAINT "transfer_options_transfer_type_id_fkey" FOREIGN KEY ("transfer_type_id") REFERENCES "public"."vocabulary_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resort_amenities" ADD CONSTRAINT "resort_amenities_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resort_amenities" ADD CONSTRAINT "resort_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resort_audiences" ADD CONSTRAINT "resort_audiences_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resort_audiences" ADD CONSTRAINT "resort_audiences_audience_tag_id_fkey" FOREIGN KEY ("audience_tag_id") REFERENCES "public"."audience_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experience_categories" ADD CONSTRAINT "experience_categories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experience_categories" ADD CONSTRAINT "experience_categories_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experiences" ADD CONSTRAINT "experiences_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."experience_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experiences" ADD CONSTRAINT "experiences_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experiences" ADD CONSTRAINT "experiences_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resort_experiences" ADD CONSTRAINT "resort_experiences_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resort_experiences" ADD CONSTRAINT "resort_experiences_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."island_experiences" ADD CONSTRAINT "island_experiences_island_id_fkey" FOREIGN KEY ("island_id") REFERENCES "public"."islands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."island_experiences" ADD CONSTRAINT "island_experiences_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offers" ADD CONSTRAINT "offers_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offers" ADD CONSTRAINT "offers_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offers" ADD CONSTRAINT "offers_occupancy_basis_id_fkey" FOREIGN KEY ("occupancy_basis_id") REFERENCES "public"."vocabulary_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offers" ADD CONSTRAINT "offers_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."vocabulary_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offers" ADD CONSTRAINT "offers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offers" ADD CONSTRAINT "offers_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offer_inclusions" ADD CONSTRAINT "offer_inclusions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offer_exclusions" ADD CONSTRAINT "offer_exclusions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offer_audiences" ADD CONSTRAINT "offer_audiences_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offer_audiences" ADD CONSTRAINT "offer_audiences_audience_tag_id_fkey" FOREIGN KEY ("audience_tag_id") REFERENCES "public"."audience_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collections" ADD CONSTRAINT "collections_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collections" ADD CONSTRAINT "collections_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collection_items" ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_categories" ADD CONSTRAINT "content_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."content_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_categories" ADD CONSTRAINT "content_categories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_categories" ADD CONSTRAINT "content_categories_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."content_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."expert_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."expert_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_og_media_id_fkey" FOREIGN KEY ("og_media_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."article_tags" ADD CONSTRAINT "article_tags_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."article_tags" ADD CONSTRAINT "article_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_relations" ADD CONSTRAINT "content_relations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."faqs" ADD CONSTRAINT "faqs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."faqs" ADD CONSTRAINT "faqs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."homepage_modules" ADD CONSTRAINT "homepage_modules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."homepage_modules" ADD CONSTRAINT "homepage_modules_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reusable_blocks" ADD CONSTRAINT "reusable_blocks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reusable_blocks" ADD CONSTRAINT "reusable_blocks_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media_assets" ADD CONSTRAINT "media_assets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media_links" ADD CONSTRAINT "media_links_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."awards" ADD CONSTRAINT "awards_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."awards" ADD CONSTRAINT "awards_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."awards" ADD CONSTRAINT "awards_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_items" ADD CONSTRAINT "saved_items_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_consent_record_id_fkey" FOREIGN KEY ("consent_record_id") REFERENCES "public"."consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiries" ADD CONSTRAINT "enquiries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiries" ADD CONSTRAINT "enquiries_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiries" ADD CONSTRAINT "enquiries_trip_type_id_fkey" FOREIGN KEY ("trip_type_id") REFERENCES "public"."vocabulary_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_travelers" ADD CONSTRAINT "enquiry_travelers_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_resorts" ADD CONSTRAINT "enquiry_resorts_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_resorts" ADD CONSTRAINT "enquiry_resorts_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_offers" ADD CONSTRAINT "enquiry_offers_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_offers" ADD CONSTRAINT "enquiry_offers_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_interests" ADD CONSTRAINT "enquiry_interests_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_interests" ADD CONSTRAINT "enquiry_interests_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_status_history" ADD CONSTRAINT "enquiry_status_history_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_status_history" ADD CONSTRAINT "enquiry_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_assignments" ADD CONSTRAINT "enquiry_assignments_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_assignments" ADD CONSTRAINT "enquiry_assignments_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_assignments" ADD CONSTRAINT "enquiry_assignments_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enquiry_assignments" ADD CONSTRAINT "enquiry_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notes" ADD CONSTRAINT "notes_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notes" ADD CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."communication_logs" ADD CONSTRAINT "communication_logs_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."communication_logs" ADD CONSTRAINT "communication_logs_logged_by_id_fkey" FOREIGN KEY ("logged_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_active_version_id_fkey" FOREIGN KEY ("active_version_id") REFERENCES "public"."quote_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_versions" ADD CONSTRAINT "quote_versions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_versions" ADD CONSTRAINT "quote_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_versions" ADD CONSTRAINT "quote_versions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_versions" ADD CONSTRAINT "quote_versions_pdf_media_id_fkey" FOREIGN KEY ("pdf_media_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."itinerary_segments" ADD CONSTRAINT "itinerary_segments_quote_version_id_fkey" FOREIGN KEY ("quote_version_id") REFERENCES "public"."quote_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."itinerary_segments" ADD CONSTRAINT "itinerary_segments_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."itinerary_segments" ADD CONSTRAINT "itinerary_segments_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."itinerary_segments" ADD CONSTRAINT "itinerary_segments_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."vocabulary_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_quote_version_id_fkey" FOREIGN KEY ("quote_version_id") REFERENCES "public"."quote_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_responses" ADD CONSTRAINT "quote_responses_quote_version_id_fkey" FOREIGN KEY ("quote_version_id") REFERENCES "public"."quote_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_responses" ADD CONSTRAINT "quote_responses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_staff_sender_id_fkey" FOREIGN KEY ("staff_sender_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_customer_sender_id_fkey" FOREIGN KEY ("customer_sender_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_deliveries" ADD CONSTRAINT "email_deliveries_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "public"."resorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_settings" ADD CONSTRAINT "system_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
