import {createScopedRegistry} from './native-hook-registry.js';
import {inDashboardScope} from './scope.js';
export const scopedCustomElements=createScopedRegistry(globalThis.customElements,inDashboardScope);
