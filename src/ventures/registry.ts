import { sql } from '../db/index.js';
import type { VentureModuleContract } from './types.js';
import { marketingOutreachModule } from './modules/marketing/index.js';
import { businessAcquisitionModule } from './modules/acquisition/index.js';

export class VentureRegistry {
  private modules = new Map<string, VentureModuleContract>();

  constructor() {
    this.register(marketingOutreachModule);
    this.register(businessAcquisitionModule);
  }

  register(module: VentureModuleContract): void {
    this.modules.set(module.id, module);
  }

  get(id: string): VentureModuleContract | undefined {
    return this.modules.get(id);
  }

  listModules(): VentureModuleContract[] {
    return Array.from(this.modules.values());
  }

  async syncWithDatabase(): Promise<void> {
    for (const mod of this.modules.values()) {
      await sql`
        INSERT INTO venture_modules (
          id, name, version, is_enabled, description, supported_workflows
        ) VALUES (
          ${mod.id}, ${mod.name}, ${mod.version}, true, ${mod.description},
          ${JSON.stringify(mod.supportedWorkflows)}::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          version = EXCLUDED.version,
          description = EXCLUDED.description,
          supported_workflows = EXCLUDED.supported_workflows;
      `;
    }
  }
}

export const ventureRegistry = new VentureRegistry();
