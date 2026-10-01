CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'TEAM_MEMBER' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`profile_image` text,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);
CREATE INDEX IF NOT EXISTS `idx_users_role` ON `users` (`role`);
CREATE INDEX IF NOT EXISTS `idx_users_status` ON `users` (`status`);

CREATE TABLE IF NOT EXISTS `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`meta_lead_id` text,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`state` text,
	`city` text,
	`lead_status` text DEFAULT 'NEW' NOT NULL,
	`source` text,
	`campaign_name` text,
	`adset_name` text,
	`ad_name` text,
	`form_name` text,
	`custom_fields` text,
	`assigned_team_member_id` text,
	`remarks` text,
	`created_by_id` text,
	`updated_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_customers_meta_lead_id` ON `customers` (`meta_lead_id`);
CREATE INDEX IF NOT EXISTS `idx_customers_email` ON `customers` (`email`);
CREATE INDEX IF NOT EXISTS `idx_customers_phone` ON `customers` (`phone`);
CREATE INDEX IF NOT EXISTS `idx_customers_lead_status` ON `customers` (`lead_status`);
CREATE INDEX IF NOT EXISTS `idx_customers_assigned_team_member` ON `customers` (`assigned_team_member_id`);
CREATE INDEX IF NOT EXISTS `idx_customers_created_at` ON `customers` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_customers_updated_at` ON `customers` (`updated_at`);

CREATE TABLE IF NOT EXISTS `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`team_member_id` text NOT NULL,
	`amount` real NOT NULL,
	`payment_date` integer DEFAULT (unixepoch()) NOT NULL,
	`payment_mode` text DEFAULT 'CASH' NOT NULL,
	`payment_status` text DEFAULT 'PENDING' NOT NULL,
	`transaction_id` text,
	`remarks` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_payments_customer` ON `payments` (`customer_id`);
CREATE INDEX IF NOT EXISTS `idx_payments_team_member` ON `payments` (`team_member_id`);
CREATE INDEX IF NOT EXISTS `idx_payments_status` ON `payments` (`payment_status`);
CREATE INDEX IF NOT EXISTS `idx_payments_date` ON `payments` (`payment_date`);

CREATE TABLE IF NOT EXISTS `customer_remarks` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`user_id` text NOT NULL,
	`remark` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_remarks_customer` ON `customer_remarks` (`customer_id`);

CREATE TABLE IF NOT EXISTS `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`customer_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`description` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_activity_user` ON `activity_logs` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_activity_customer` ON `activity_logs` (`customer_id`);
CREATE INDEX IF NOT EXISTS `idx_activity_entity` ON `activity_logs` (`entity_type`, `entity_id`);
CREATE INDEX IF NOT EXISTS `idx_activity_created` ON `activity_logs` (`created_at`);

CREATE TABLE IF NOT EXISTS `lead_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`total_rows` integer NOT NULL,
	`new_leads` integer DEFAULT 0 NOT NULL,
	`updated_leads` integer DEFAULT 0 NOT NULL,
	`duplicate_leads` integer DEFAULT 0 NOT NULL,
	`failed_rows` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`imported_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_imports_created` ON `lead_imports` (`created_at`);

CREATE TABLE IF NOT EXISTS `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `password_resets_token_unique` ON `password_resets` (`token`);
