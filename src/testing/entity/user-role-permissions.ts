export enum Permission {
	FILESTORAGE_VIEW = 'FILESTORAGE_VIEW',
	FILESTORAGE_EDIT = 'FILESTORAGE_EDIT',
	FILESTORAGE_CREATE = 'FILESTORAGE_CREATE',
	FILESTORAGE_REMOVE = 'FILESTORAGE_REMOVE',
	INSTANCE_VIEW = 'INSTANCE_VIEW',
}

export const userPermissions = [
	Permission.FILESTORAGE_VIEW,
	Permission.FILESTORAGE_EDIT,
	Permission.FILESTORAGE_CREATE,
];

export const studentPermissions = [...userPermissions];

export const teacherPermissions = [...userPermissions];

export const adminPermissions = [...userPermissions];

export const superheroPermissions = [...userPermissions, Permission.INSTANCE_VIEW];
