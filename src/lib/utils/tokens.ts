export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
