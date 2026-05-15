export const LICENSE_ROOT = 'INSERT_HERE'

export function hasRootLicense(value?: string | null) {
  return Boolean(value && value === LICENSE_ROOT && LICENSE_ROOT !== 'INSERT_HERE')
}
