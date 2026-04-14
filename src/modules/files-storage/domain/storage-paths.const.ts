export enum StorageType {
	STANDARD = 'standard',
	TEMP = 'temp',
}

/**
 * Central definition of all S3 storage paths.
 *
 * Path structure in S3 bucket:
 * - Standard:  {storageLocationId}/{fileRecordId}
 * - Temp:      temp/{storageLocationId}/{fileRecordId}
 * - Preview:   previews/{storageLocationId}/{fileRecordId}/{hash}
 * - Trash:     trash/{originalPath}
 *
 * Lifecycle rules (S3 deletes after midnight UTC on expiration day):
 * - Trash:    7 days
 * - Temp:     1 day
 * - Preview:  180 days
 */
export const StorageFolders = {
	/** Standard storage - no prefix (root level) */
	[StorageType.STANDARD]: '',
	/** Folder prefix for temporary files */
	[StorageType.TEMP]: 'temp',
	/** Folder for preview files */
	PREVIEW: 'previews',
	/** Folder for soft-deleted files (trash) */
	TRASH: 'trash',
} as const satisfies Record<string, string>;

/**
 * S3 lifecycle expiration configuration in days.
 * Objects in these folders are automatically deleted after midnight UTC on the expiration day.
 */
export const FolderExpirationDays = {
	[StorageType.TEMP]: 1,
	TRASH: 7,
	PREVIEW: 180,
} as const satisfies Record<string, number>;
