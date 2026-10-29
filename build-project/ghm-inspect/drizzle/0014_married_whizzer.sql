CREATE TABLE `deliveryEarnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`orderId` int NOT NULL,
	`deliveryFee` decimal(10,2) NOT NULL,
	`incentive` decimal(10,2) NOT NULL DEFAULT '0',
	`netAmount` decimal(10,2) NOT NULL,
	`status` enum('earned','paid') NOT NULL DEFAULT 'earned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`paidAt` timestamp,
	CONSTRAINT `deliveryEarnings_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliveryEarnings_orderId_unique` UNIQUE(`orderId`)
);
