/**
 * DTOs ARE ZOD. A validation pipe and a response contract, in about sixty lines.
 *
 * WHY NOT `class-validator`, WHICH IS WHAT NEST SHIPS WITH. One schema language
 * across the stack. `apps/ai/insurance/src/schema/coverage-schema.ts` makes the
 * argument for the answer contract, and it applies with more force here: this
 * API's request shapes, the MCP tool `inputSchema`s that call it, and
 * `ResolutionAnswerSchema` at the far end are all the same dialect, so a shape
 * can be moved between the three layers without being retyped into a second
 * notation that will drift. `class-validator` would also put the constraints on
 * a decorated class, which means the constraint and the type are two artefacts
 * that agree only by inspection.
 *
 * WHY NOT `nestjs-zod`, WHICH IS THE OBVIOUS PACKAGE FOR THIS — MEASURED,
 * 2026-09-18, `npm view nestjs-zod version peerDependencies`:
 *
 *     nestjs-zod@5.5.0
 *     peerDependencies: { '@nestjs/common': '^10.0.0 || ^11.0.0',
 *                         '@nestjs/swagger': '^7.4.2 || ^8.0.0 || ^11.0.0',
 *                         rxjs: '^7.0.0', zod: '^3.25.0 || ^4.0.0' }
 *
 * It does not declare support for `@nestjs/common` ^12, which is the version
 * PLAN.md §4.3 pins, and it additionally requires `@nestjs/swagger` — a whole
 * OpenAPI layer this API has no use for. Installing it means either an
 * unsatisfied peer warning that everyone learns to ignore, or dragging Swagger
 * in to satisfy a dependency of a dependency. The pipe below is the part of it
 * this app actually uses, it is shorter than the paragraph justifying it, and it
 * has no opinion about Nest's version.
 *
 * Revisit when nestjs-zod declares ^12.
 */
import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validate one handler argument against a schema.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: leak Zod's message text straight to the
 * caller. Zod issues name paths and received values, and a received value here
 * is an order id someone typed. The caller gets the FIELD and the RULE; the
 * value stays on this side.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new BadRequestException({
      error: 'the request did not match this endpoint\'s contract',
      problems: result.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        rule: issue.code,
        message: issue.message,
      })),
    });
  }
}

/** Sugar so a handler reads as `@Param(zodPipe(OrderIdParam))`. */
export function zodPipe<T>(schema: ZodType<T>): ZodValidationPipe<T> {
  return new ZodValidationPipe(schema);
}

/**
 * Parse a response through its own schema before it leaves the building.
 *
 * THIS IS THE HALF THAT USUALLY GETS SKIPPED, and it is the half
 * `commerce:round-trip` will depend on. An API whose requests are validated and
 * whose responses are not is an API whose DTOs are a comment: rename a column in
 * the DDL, introspect it, and a `null` flows all the way to the model, which
 * writes a fluent answer around a missing fact. Failing HERE turns that into a
 * 500 in the API's own log, which is where it belongs and where someone is
 * looking.
 *
 * It throws rather than returning a Miss on purpose — a response that does not
 * match its own contract is this API's bug, which is infrastructure, not a
 * domain answer about Thornbury.
 */
export function shapeResponse<T>(schema: ZodType<T>, value: unknown, where: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const first = result.error.issues[0];
  throw new Error(
    `${where} built a response that does not match its own DTO: ` +
      `${first.path.join('.') || '(root)'} — ${first.message}. ` +
      `This is a schema drift between the DDL and prisma/*.prisma; re-run ` +
      `\`pnpm commerce:api-pull\`.`,
  );
}
