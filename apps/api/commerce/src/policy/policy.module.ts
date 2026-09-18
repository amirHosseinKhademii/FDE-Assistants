/** Policy as configuration. No scope check — see src/policy/policy.controller.ts. */
import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { POLICY_CLIENT, createPolicyHandle, type PolicyHandle } from './policy.client';
import { PolicyService } from './policy.service';
import { PolicyController } from './policy.controller';
import { closeHandle } from '../common/system-module';

const POLICY_HANDLE = 'POLICY_HANDLE';

@Module({
  controllers: [PolicyController],
  providers: [
    { provide: POLICY_HANDLE, useFactory: createPolicyHandle },
    {
      provide: POLICY_CLIENT,
      useFactory: (handle: PolicyHandle) => handle.client,
      inject: [POLICY_HANDLE],
    },
    PolicyService,
  ],
  exports: [POLICY_CLIENT, PolicyService],
})
export class PolicyModule implements OnApplicationShutdown {
  constructor(@Inject(POLICY_HANDLE) private readonly handle: PolicyHandle) {}

  async onApplicationShutdown(): Promise<void> {
    await closeHandle(this.handle);
  }
}
