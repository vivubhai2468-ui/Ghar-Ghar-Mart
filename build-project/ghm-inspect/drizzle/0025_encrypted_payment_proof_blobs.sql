CREATE TABLE `paymentProofBlobs` (
  `orderId` int NOT NULL,
  `encryptedData` longblob NOT NULL,
  `iv` varbinary(12) NOT NULL,
  `authTag` varbinary(16) NOT NULL,
  `contentType` varchar(32) NOT NULL,
  `keyVersion` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`orderId`),
  CONSTRAINT `paymentProofBlobs_orderId_orders_id_fk`
    FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`)
    ON DELETE CASCADE
);
