CREATE TABLE `bio_data` (
	`id` text PRIMARY KEY NOT NULL,
	`response_id` text NOT NULL,
	`skin_potential` real,
	`emotion` text,
	`emotion_confidence` real,
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`session_number` integer NOT NULL,
	`experiment_date` integer NOT NULL,
	`env_temperature` real,
	`env_humidity` real,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `media_files` (
	`id` text PRIMARY KEY NOT NULL,
	`response_id` text NOT NULL,
	`audio_file_path` text,
	`video_file_path` text,
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`gender` text,
	`handedness` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`word_stimulus_id` integer NOT NULL,
	`response_word` text,
	`reaction_time_ms` integer,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`word_stimulus_id`) REFERENCES `word_stimuli`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `word_stimuli` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `word_stimuli_word_unique` ON `word_stimuli` (`word`);