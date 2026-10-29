CREATE TABLE `regionalInventories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`pincode` varchar(10) NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `regionalInventories_id` PRIMARY KEY(`id`)
);
