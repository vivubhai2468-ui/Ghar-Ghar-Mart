CREATE TABLE IF NOT EXISTS `adminNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`type` enum('new_order','pending_approval','low_stock','seller_registration','payment_received','system_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedOrderId` int,
	`relatedProductId` int,
	`relatedSellerId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`actionUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `adminNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`adminName` varchar(255) NOT NULL,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`oldValue` json,
	`newValue` json,
	`changes` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`status` enum('success','failed','pending') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deliveryEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`actorId` int,
	`status` enum('assigned','picked_up','out_for_delivery','nearby','delivered','cancelled') NOT NULL,
	`message` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliveryEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deliveryLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`partnerId` int NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`accuracy` decimal(8,2),
	`source` enum('foreground','background','manual') NOT NULL DEFAULT 'foreground',
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliveryLocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `devicePushTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(512) NOT NULL,
	`platform` enum('ios','android','web') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `devicePushTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `devicePushTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','seller','delivery_partner') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryPartnerId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryPartnerName` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `currentLatitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `orders` ADD `currentLongitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `orders` ADD `lastLocationAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryEtaMinutes` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `riderNearNotifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `riderArrivingNotifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryOtpHash` varchar(128);--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryOtpExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryOtpVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `proofOfDeliveryUrl` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `proofOfDeliveryCapturedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveredAt` timestamp;