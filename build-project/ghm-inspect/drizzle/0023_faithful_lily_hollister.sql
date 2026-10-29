CREATE TABLE `customerPasswordResetTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerPasswordResetTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `customerPasswordResetTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
