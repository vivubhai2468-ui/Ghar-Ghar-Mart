CREATE TABLE `homeOfferBanners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` varchar(280) NOT NULL,
	`badgeText` varchar(48),
	`couponCode` varchar(48),
	`imageUrl` text,
	`backgroundColor` varchar(16) NOT NULL DEFAULT '#FFF7D1',
	`actionType` enum('none','coupon','category','url') NOT NULL DEFAULT 'coupon',
	`actionValue` varchar(500),
	`priority` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `homeOfferBanners_id` PRIMARY KEY(`id`)
);
