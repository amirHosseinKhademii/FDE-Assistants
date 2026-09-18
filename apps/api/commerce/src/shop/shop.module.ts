/** The storefront. One pool, closed on shutdown. */
import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { SHOP_CLIENT, createShopHandle, type ShopHandle } from './shop.client';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { ScopeModule } from '../scope/scope.module';
import { closeHandle } from '../common/system-module';

const SHOP_HANDLE = 'SHOP_HANDLE';

@Module({
  imports: [ScopeModule],
  controllers: [ShopController],
  providers: [
    { provide: SHOP_HANDLE, useFactory: createShopHandle },
    {
      provide: SHOP_CLIENT,
      useFactory: (handle: ShopHandle) => handle.client,
      inject: [SHOP_HANDLE],
    },
    ShopService,
  ],
  exports: [SHOP_CLIENT, ShopService],
})
export class ShopModule implements OnApplicationShutdown {
  constructor(@Inject(SHOP_HANDLE) private readonly handle: ShopHandle) {}

  async onApplicationShutdown(): Promise<void> {
    await closeHandle(this.handle);
  }
}
