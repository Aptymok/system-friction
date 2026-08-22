import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controls = readFileSync('src/components/sfi/SessionControls.tsx', 'utf8');
const legacy = readFileSync('src/components/sfi/SfiConsole.tsx', 'utf8');
const observatory = readFileSync('src/components/sfi/ObservatoryConsole.tsx', 'utf8');
const logout = readFileSync('src/app/logout/route.ts', 'utf8');

assert.match(controls, /INICIO/, 'authenticated_session_must_expose_home');
assert.match(controls, /CERRAR SESIÓN/, 'authenticated_session_must_expose_logout');
assert.match(controls, /INICIAR SESIÓN/, 'anonymous_session_must_expose_login');
assert.match(controls, /action="\/logout" method="post"/, 'logout_control_must_post_to_server_logout');
assert.match(controls, /role === 'root' \|\| role === 'system' \? '\/root' : '\/field'/, 'home_must_resolve_by_authority');
assert.match(controls, /login\?next=/, 'login_must_preserve_current_surface');
assert.match(logout, /supabase\.auth\.signOut\(\)/, 'logout_route_must_invalidate_supabase_session');
assert.match(logout, /NextResponse\.redirect\(new URL\('\/login'/, 'logout_must_return_to_login');
assert.match(legacy, /<SessionControls\/>/, 'legacy_sfi_console_must_expose_session_controls');
assert.match(observatory, /<SessionControls className="obsSessionControls"\/>/, 'observatory_must_expose_session_controls');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-SESSION-CONTROLS-1.0',
  authenticated: ['INICIO', 'CERRAR SESIÓN'],
  anonymous: ['INICIAR SESIÓN'],
  logout: 'POST /logout -> Supabase signOut -> /login',
  rootHome: '/root',
  memberHome: '/field',
}, null, 2));
