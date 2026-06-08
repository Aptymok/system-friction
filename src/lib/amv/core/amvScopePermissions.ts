export type AmvScopePermission = 'read_visible_context' | 'export_json' | 'save_reading_contract' | 'upload_contract'

export const AMV_SCOPE_PERMISSIONS: Record<string, AmvScopePermission[]> = {
  root: ['read_visible_context', 'export_json', 'save_reading_contract', 'upload_contract'],
  'governance-reality': ['read_visible_context', 'export_json', 'save_reading_contract'],
  scorefriction: ['read_visible_context', 'export_json', 'upload_contract'],
  'cluster-atlas': ['read_visible_context', 'export_json'],
  'signal-vane': ['read_visible_context', 'export_json'],
  'cognitive-twin-engine': ['read_visible_context', 'export_json', 'upload_contract'],
}

export function scopeHasPermission(scope: string, permission: AmvScopePermission) {
  return AMV_SCOPE_PERMISSIONS[scope]?.includes(permission) ?? false
}
