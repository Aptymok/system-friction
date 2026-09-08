import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveFounderAuthority } from './founderAuthority';

function withFounderEnv(
  values: { SYSTEM_ROOT_EMAIL?: string; SFI_FOUNDER_EMAILS?: string; SFI_FOUNDER_USER_IDS?: string },
  run: () => void,
) {
  const previous = {
    SYSTEM_ROOT_EMAIL: process.env.SYSTEM_ROOT_EMAIL,
    SFI_FOUNDER_EMAILS: process.env.SFI_FOUNDER_EMAILS,
    SFI_FOUNDER_USER_IDS: process.env.SFI_FOUNDER_USER_IDS,
  };
  try {
    for (const key of Object.keys(previous) as Array<keyof typeof previous>) {
      const value = values[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const key of Object.keys(previous) as Array<keyof typeof previous>) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('configured founder user id is sovereign without relying on profile projection', () => {
  withFounderEnv({ SFI_FOUNDER_USER_IDS: 'founder-id' }, () => {
    assert.deepEqual(
      resolveFounderAuthority({ userId: 'founder-id', email: 'other@example.com', profile: null }),
      { isFounder: true, source: 'configured_user_id' },
    );
  });
});

test('all configured founder email channels resolve identically', () => {
  withFounderEnv({ SYSTEM_ROOT_EMAIL: 'root@example.com', SFI_FOUNDER_EMAILS: 'founder@example.com' }, () => {
    assert.equal(resolveFounderAuthority({ email: 'ROOT@example.com' }).isFounder, true);
    assert.equal(resolveFounderAuthority({ email: 'Founder@example.com' }).isFounder, true);
  });
});

test('explicit root profile still requires full_access', () => {
  withFounderEnv({}, () => {
    assert.equal(resolveFounderAuthority({
      email: 'legacy@example.com',
      profile: { role: 'root', module_access: { root: true, root_observe: true } },
    }).isFounder, false);

    assert.deepEqual(resolveFounderAuthority({
      email: 'sovereign@example.com',
      profile: { role: 'root', module_access: { full_access: true } },
    }), { isFounder: true, source: 'explicit_sovereign_profile' });
  });
});

test('registered institutional member cannot become founder through profile flags', () => {
  withFounderEnv({}, () => {
    assert.equal(resolveFounderAuthority({
      email: 'edwin.tzolkin@gmail.com',
      profile: { role: 'root', module_access: { full_access: true } },
    }).isFounder, false);
  });
});

test('founder-state endpoint uses requireRootActor as the single sovereign admission gate', () => {
  const route = readFileSync('src/app/api/root/founder-state/route.ts', 'utf8');
  assert.match(route, /requireRootActor\('founder-state\.read'\)/);
  assert.doesNotMatch(route, /if \(!state\.access\.authorized\)/, 'founder-state must not apply a second divergent authority denial');
  assert.match(route, /authorized:\s*true/);
  assert.match(route, /userId:\s*gate\.ctx\.user\.id/);
});
