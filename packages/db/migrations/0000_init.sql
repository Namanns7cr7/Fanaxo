CREATE TABLE `assistance_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`fan_session_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`client_request_id` text NOT NULL,
	`task_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fan_session_id`) REFERENCES `fan_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assistance_client_request_unique` ON `assistance_requests` (`client_request_id`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`actor` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`resource` text NOT NULL,
	`resource_id` text NOT NULL,
	`before_hash` text,
	`after_hash` text,
	`reason` text,
	`correlation_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_venue_time_idx` ON `audit_events` (`venue_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_correlation_idx` ON `audit_events` (`venue_id`,`correlation_id`);--> statement-breakpoint
CREATE TABLE `congestion_scenarios` (
	`gate_id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`state` text NOT NULL,
	`arrival_rate` real DEFAULT 0 NOT NULL,
	`density` real DEFAULT 0 NOT NULL,
	`threshold` real NOT NULL,
	`recommendation_id` text,
	`redirect_gate_id` text,
	`assigned_volunteer_ids` text DEFAULT '[]' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`gate_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crowd_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`captured_at` text NOT NULL,
	`count` integer NOT NULL,
	`density` real NOT NULL,
	`flow_rate` real DEFAULT 0 NOT NULL,
	`confidence` real NOT NULL,
	`trend` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `crowd_snapshots_zone_time_idx` ON `crowd_snapshots` (`venue_id`,`zone_id`,`captured_at`);--> statement-breakpoint
CREATE TABLE `fan_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text,
	`venue_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`accessibility_profile` text,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fan_sessions_token_unique` ON `fan_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `gate_states` (
	`gate_id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`queue_minutes` real DEFAULT 0 NOT NULL,
	`throughput` integer DEFAULT 0 NOT NULL,
	`current_count` integer DEFAULT 0 NOT NULL,
	`capacity` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`gate_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL,
	`status` text NOT NULL,
	`reporter_id` text NOT NULL,
	`reporter_role` text NOT NULL,
	`summary` text NOT NULL,
	`description` text,
	`assignee_id` text,
	`attachment_ids` text DEFAULT '[]' NOT NULL,
	`client_request_id` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`correlation_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `incidents_client_request_unique` ON `incidents` (`client_request_id`);--> statement-breakpoint
CREATE INDEX `incidents_queue_idx` ON `incidents` (`venue_id`,`status`,`severity`,`created_at`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`home_label` text NOT NULL,
	`away_label` text NOT NULL,
	`starts_at` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`audience` text NOT NULL,
	`zone_id` text,
	`locale` text NOT NULL,
	`channel` text NOT NULL,
	`message` text NOT NULL,
	`status` text NOT NULL,
	`client_request_id` text,
	`sent_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_client_request_unique` ON `notifications` (`client_request_id`);--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`context_type` text NOT NULL,
	`context_id` text NOT NULL,
	`summary` text NOT NULL,
	`risk_level` text NOT NULL,
	`confidence` real NOT NULL,
	`evidence` text NOT NULL,
	`proposed_actions` text NOT NULL,
	`limitations` text DEFAULT '[]' NOT NULL,
	`status` text NOT NULL,
	`operator_decision` text,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recommendations_venue_idx` ON `recommendations` (`venue_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `route_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`from_node_id` text NOT NULL,
	`to_node_id` text NOT NULL,
	`distance` real NOT NULL,
	`expected_time_seconds` real NOT NULL,
	`capacity` integer NOT NULL,
	`live_density` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`has_stairs` integer DEFAULT false NOT NULL,
	`has_lift` integer DEFAULT false NOT NULL,
	`has_ramp` integer DEFAULT false NOT NULL,
	`is_indoor` integer DEFAULT true NOT NULL,
	`sensory_intensity` text DEFAULT 'medium' NOT NULL,
	`slope` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_node_id`) REFERENCES `route_nodes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_node_id`) REFERENCES `route_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `route_edges_from_idx` ON `route_edges` (`venue_id`,`from_node_id`);--> statement-breakpoint
CREATE TABLE `route_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`floor` integer DEFAULT 0 NOT NULL,
	`zone_id` text,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `route_nodes_venue_idx` ON `route_nodes` (`venue_id`);--> statement-breakpoint
CREATE TABLE `staff_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`venue_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_sessions_token_unique` ON `staff_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`incident_id` text,
	`assignee_id` text,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`instructions` text NOT NULL,
	`zone_id` text NOT NULL,
	`due_at` text,
	`client_request_id` text,
	`version` integer DEFAULT 0 NOT NULL,
	`correlation_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_client_request_unique` ON `tasks` (`client_request_id`);--> statement-breakpoint
CREATE INDEX `tasks_assignee_idx` ON `tasks` (`assignee_id`,`status`,`priority`,`created_at`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`gate_id` text NOT NULL,
	`section` text NOT NULL,
	`row` text NOT NULL,
	`seat` text NOT NULL,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'valid' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gate_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_token_hash_unique` ON `tickets` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_match_seat_unique` ON `tickets` (`match_id`,`section`,`row`,`seat`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`display_name` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`email` text,
	`password_hash` text,
	`badge_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_badge_unique` ON `users` (`badge_id`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`capacity` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `volunteer_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`role_type` text NOT NULL,
	`zone_id` text NOT NULL,
	`shift_start` text NOT NULL,
	`shift_end` text NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`display_name` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `zones` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`capacity` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`width` real,
	`height` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `zones_venue_idx` ON `zones` (`venue_id`);