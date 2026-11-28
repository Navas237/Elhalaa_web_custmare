import test from 'node:test'
import assert from 'node:assert/strict'
import {
  authOrigin, shopSubdomainFromOrigin, isHashedNonce, isInAppBrowser, RESERVED_SUBDOMAINS,
} from '../src/utils/google-auth.ts'

const ROOT = 'elhalaa.com'

test('authOrigin', () => {
  assert.equal(authOrigin('elhalaa.com'), 'https://auth.elhalaa.com')
  assert.equal(authOrigin('localhost:3000'), 'http://auth.localhost:3000')
})

test('accepts a shop origin', () => {
  assert.equal(shopSubdomainFromOrigin('https://vip.elhalaa.com', ROOT), 'vip')
  assert.equal(shopSubdomainFromOrigin('https://my-salon-2.elhalaa.com', ROOT), 'my-salon-2')
  assert.equal(shopSubdomainFromOrigin('http://vip.localhost:3000', 'localhost:3000'), 'vip')
})

test('rejects bad origins', () => {
  const bad = [
    'http://vip.elhalaa.com',            // wrong scheme
    'https://elhalaa.com',                // apex
    'https://www.elhalaa.com',            // reserved
    'https://auth.elhalaa.com',           // reserved
    'https://app.elhalaa.com',
    'https://hq-7m4x.elhalaa.com',
    'https://a.b.elhalaa.com',            // two labels
    'https://vip.elhalaa.com.evil.com',
    'https://evilelhalaa.com',
    'https://vip.elhalaa.com/',           // trailing slash
    'https://vip.elhalaa.com/path',
    'https://vip.elhalaa.com?x=1',
    'https://user:pw@vip.elhalaa.com',
    'https://vip.elhalaa.com:8443',       // port
    'javascript:alert(1)',
    '',
    '//vip.elhalaa.com',
    '-x.elhalaa.com',
  ]
  for (const o of bad) assert.equal(shopSubdomainFromOrigin(o, ROOT), null, o)
  assert.equal(shopSubdomainFromOrigin(undefined, ROOT), null)
  assert.equal(shopSubdomainFromOrigin('http://vip.localhost:4000', 'localhost:3000'), null)
  assert.equal(shopSubdomainFromOrigin('http://vip.localhost', 'localhost:3000'), null)
})

test('reserved includes auth and the dashboard hosts', () => {
  for (const r of ['auth', 'www', 'app', 'admin', 'hq-7m4x', 'api', 'mail', 'default']) {
    assert.ok(RESERVED_SUBDOMAINS.has(r), r)
  }
})

test('nonce shape', () => {
  assert.ok(isHashedNonce('a'.repeat(64)))
  assert.ok(!isHashedNonce('A'.repeat(64)))
  assert.ok(!isHashedNonce('a'.repeat(63)))
  assert.ok(!isHashedNonce(undefined))
})

test('in-app browser detection', () => {
  assert.ok(isInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit Instagram 300.0'))
  assert.ok(isInAppBrowser('Mozilla/5.0 (Linux; Android) FBAN/FB4A'))
  assert.ok(!isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1'))
})
