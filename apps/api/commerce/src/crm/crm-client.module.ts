/**
 * The contact centre's POOL, on its own, so that nothing has to import the
 * contact centre's CONTROLLER to get at its data.
 *
 * WHY THIS MODULE EXISTS — a cycle, and the honest fix for it. `ScopeService`
 * needs the CRM client, because every scope decision starts by reading a case.
 * `CrmController` needs `ScopeService`, because its own two endpoints are scoped
 * like every other. Written as two modules that import each other, that is a
 * genuine circular dependency, and Nest says so:
 *
 *     UndefinedModuleException: Nest cannot create the CrmModule instance.
 *     The module at index [0] of the CrmModule "imports" array is undefined.
 *
 * `forwardRef()` on both sides would make it start. It would also leave a cycle
 * in place and a comment explaining why the cycle is fine, which is the kind of
 * thing that is true until somebody adds a third participant. The cycle is not
 * actually necessary: what `ScopeModule` needs is the CLIENT, not the module
 * that owns the endpoints. Splitting the connection out breaks the loop for
 * real —
 *
 *     CrmClientModule  ←  ScopeModule  ←  CrmModule
 *                      ←────────────────────┘
 *
 * — and nothing forward-references anything.
 *
 * It owns the pool and closes it, because the thing that opened a resource is
 * the thing that should close it.
 */
import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { CRM_CLIENT, createCrmHandle, type CrmHandle } from './crm.client';
import { closeHandle } from '../common/system-module';

const CRM_HANDLE = 'CRM_HANDLE';

@Module({
  providers: [
    { provide: CRM_HANDLE, useFactory: createCrmHandle },
    {
      provide: CRM_CLIENT,
      useFactory: (handle: CrmHandle) => handle.client,
      inject: [CRM_HANDLE],
    },
  ],
  exports: [CRM_CLIENT],
})
export class CrmClientModule implements OnApplicationShutdown {
  constructor(@Inject(CRM_HANDLE) private readonly handle: CrmHandle) {}

  async onApplicationShutdown(): Promise<void> {
    await closeHandle(this.handle);
  }
}
