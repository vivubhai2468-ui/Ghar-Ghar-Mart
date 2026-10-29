CREATE TABLE `deliveryPricingSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`baseDistanceKm` decimal(10,2) NOT NULL DEFAULT '2.00',
	`baseCharge` decimal(10,2) NOT NULL DEFAULT '10.00',
	`additionalChargePerKm` decimal(10,2) NOT NULL DEFAULT '5.00',
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliveryPricingSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryDistanceKm` decimal(10,2);