CREATE TABLE `sellerDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`documentType` enum('aadhaar_card','address_proof','business_license') NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewerId` int,
	`reviewerNote` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sellerDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sellerPayoutProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`accountHolderName` varchar(255) NOT NULL,
	`accountNumberHash` varchar(128) NOT NULL,
	`accountNumberLast4` varchar(4) NOT NULL,
	`ifscCode` varchar(11) NOT NULL,
	`bankName` varchar(255),
	`status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`reviewerId` int,
	`reviewerNote` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sellerPayoutProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `sellerPayoutProfiles_sellerId_unique` UNIQUE(`sellerId`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `approvalStatus` enum('pending','approved','rejected') DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `moderationNote` text;--> statement-breakpoint
ALTER TABLE `products` ADD `moderatedBy` int;--> statement-breakpoint
ALTER TABLE `products` ADD `moderatedAt` timestamp;