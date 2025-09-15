import { AuthGuardModule, AuthGuardOptions } from '@infra/auth-guard';
import { AuthorizationClientModule } from '@infra/authorization-client';
import { CollaboraModule } from '@infra/collabora';
import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { FilesStorageModule } from '@modules/files-storage/files-storage.module';
import { Module } from '@nestjs/common';
import { WopiController, WopiUc } from './api';
import { WopiModule } from './wopi.module';

const imports = [
	WopiModule,
	ErrorModule,
	LoggerModule,
	FilesStorageModule,
	CollaboraModule,
	AuthGuardModule.register([AuthGuardOptions.JWT]),
	AuthorizationClientModule.register(),
];
const providers = [WopiUc, WopiController];

@Module({
	imports,
	providers,
	exports: [WopiUc, WopiController],
})
export class WopiApiModule {}
