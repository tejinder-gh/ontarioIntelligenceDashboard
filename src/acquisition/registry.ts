import type { SourceMetadata, SourceAdapter } from './types.js';
import { REGISTERED_SOURCES } from './sources-catalog.js';

export { REGISTERED_SOURCES };

export class SourceRegistry {
  private adapters = new Map<string, SourceAdapter>();

  registerAdapter(adapter: SourceAdapter): void {
    this.adapters.set(adapter.metadata.sourceId, adapter);
  }

  getAdapter(sourceId: string): SourceAdapter | undefined {
    return this.adapters.get(sourceId);
  }

  listSources(): SourceMetadata[] {
    return Object.values(REGISTERED_SOURCES);
  }

  isMarketingPermitted(sourceId: string): boolean {
    const meta = REGISTERED_SOURCES[sourceId];
    return meta ? meta.marketingPermitted : false;
  }
}

export const sourceRegistry = new SourceRegistry();

import { placesAdapter } from './adapters/places-adapter.js';
import { torontoLicencesAdapter } from './adapters/toronto-licences-adapter.js';

sourceRegistry.registerAdapter(placesAdapter);
sourceRegistry.registerAdapter(torontoLicencesAdapter);
