/** The warehouse. No controller yet — see src/wms/wms.service.ts for why it exists anyway. */
import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { WMS_CLIENT, createWmsHandle, type WmsHandle } from './wms.client';
import { WmsService } from './wms.service';
import { closeHandle } from '../common/system-module';

const WMS_HANDLE = 'WMS_HANDLE';

@Module({
  providers: [
    { provide: WMS_HANDLE, useFactory: createWmsHandle },
    {
      provide: WMS_CLIENT,
      useFactory: (handle: WmsHandle) => handle.client,
      inject: [WMS_HANDLE],
    },
    WmsService,
  ],
  exports: [WMS_CLIENT, WmsService],
})
export class WmsModule implements OnApplicationShutdown {
  constructor(@Inject(WMS_HANDLE) private readonly handle: WmsHandle) {}

  async onApplicationShutdown(): Promise<void> {
    await closeHandle(this.handle);
  }
}
