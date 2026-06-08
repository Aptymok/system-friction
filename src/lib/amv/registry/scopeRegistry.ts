import { rootScope } from '../scopes/root/rootScope'
import { governanceRealityScope } from '../scopes/governance-reality/governance-realityScope'
import { scorefrictionScope } from '../scopes/scorefriction/scorefrictionScope'
import { clusterAtlasScope } from '../scopes/cluster-atlas/cluster-atlasScope'
import { signalVaneScope } from '../scopes/signal-vane/signal-vaneScope'
import { cognitiveTwinEngineScope } from '../scopes/cognitive-twin-engine/cognitive-twin-engineScope'
import type { AmvScopeDefinition } from '../core/amvTypes'
import { getAmvInstrumentByScope } from './instrumentRegistry'

const AMV_SCOPES: Record<string, AmvScopeDefinition> = {
  [rootScope.id]: rootScope,
  [governanceRealityScope.id]: governanceRealityScope,
  [scorefrictionScope.id]: scorefrictionScope,
  [clusterAtlasScope.id]: clusterAtlasScope,
  [signalVaneScope.id]: signalVaneScope,
  [cognitiveTwinEngineScope.id]: cognitiveTwinEngineScope,
}

export function getAmvScope(scope: string) {
  return AMV_SCOPES[scope]
}

export function listAmvScopes() {
  return Object.keys(AMV_SCOPES)
}

export function getAmvScopeInstrument(scope: string) {
  return getAmvInstrumentByScope(scope)
}
