CREATE TABLE `sellerDocumentBlobs` (
  `documentId` int NOT NULL,
  `encryptedData` longblob NOT NULL,
  `iv` varbinary(12) NOT NULL,
  `authTag` varbinary(16) NOT NULL,
  `keyVersion` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`documentId`),
  CONSTRAINT `sellerDocumentBlobs_documentId_sellerDocuments_id_fk`
    FOREIGN KEY (`documentId`) REFERENCES `sellerDocuments`(`id`)
    ON DELETE CASCADE
);
