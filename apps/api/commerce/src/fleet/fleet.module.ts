/** Transport and telematics. See src/shop/shop.module.ts for the pattern. */
import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { FLEET_CLIENT, createFleetHandle, type FleetHandle } from './fleet.client';
import { FleetService } from './fleet.service';
import { FleetController } from './fleet.controller';
import { ScopeModule } from '../scope/scope.module';
import { closeHandle } from '../common/system-module';

const FLEET_HANDLE = 'FLEET_HANDLE';

@Module({
  imports: [ScopeModule],
  controllers: [FleetController],
  providers: [
    { provide: FLEET_HANDLE, useFactory: createFleetHandle },
    {
      provide: FLEET_CLIENT,
      useFactory: (handle: FleetHandle) => handle.client,
      inject: [FLEET_HANDLE],
    },
    FleetService,
  ],
  exports: [FLEET_CLIENT, FleetService],
})
export class FleetModule implements OnApplicationShutdown {
  constructor(@Inject(FLEET_HANDLE) private readonly handle: FleetHandle) {}

  async onApplicationShutdown(): Promise<void> {
    await closeHandle(this.handle);
  }
}
