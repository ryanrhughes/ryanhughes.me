import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

let server;
let PlinkoBoard;
let PLINKO_Z;
const originalDocument = globalThis.document;

before(async () => {
  // Labels are irrelevant to these headless rigid-body checks.
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillText() {} }) }) };
  await RAPIER.init();
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  ({ PlinkoBoard, PLINKO_Z } = await server.ssrLoadModule('/src/plinko.ts'));
});

after(async () => { await server?.close(); globalThis.document = originalDocument; });

function fixture() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / 60;
  world.numSolverIterations = 8;
  const awards = [];
  const board = new PlinkoBoard(world, new THREE.Group(), (prize, position) => awards.push({ prize, position }), () => {});
  function step(time = 0) { board.beforeStep(time); world.step(); board.afterStep(1 / 60); }
  step(); step();
  function coin(x, y, z = PLINKO_Z) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setRotation(q).setCcdEnabled(true));
    const collider = world.createCollider(RAPIER.ColliderDesc.cylinder(0.042, 0.235).setDensity(2.7).setFriction(0.42).setRestitution(0.12), body);
    const mass = body.mass();
    board.enter(body, collider);
    return { body, collider, mass };
  }
  return { world, board, awards, step, coin };
}

test('passing a cup at the wrong depth never awards a bonus', () => {
  const f = fixture();
  const cup = f.board.getDebugState().cups[0];
  f.coin(cup.x, 3.6, PLINKO_Z + 0.8);
  for (let i = 0; i < 90; i++) f.step();
  assert.equal(f.awards.length, 0);
  assert.equal(f.board.getDebugState().misses, 1);
  f.world.free();
});

test('missing the treasure cup gives no bonus', () => {
  const f = fixture();
  f.coin(-1.03, 3.5);
  for (let i = 0; i < 90; i++) f.step();
  assert.equal(f.awards.length, 0);
  assert.equal(f.board.getDebugState().misses, 1);
  f.world.free();
});

test('former side targets are open exits with no awards or coin traps', () => {
  const f = fixture();
  assert.deepEqual(f.board.getDebugState().cups.map(cup => cup.prize), ['gem']);
  const coins = [-2.13, 2.13].map(x => f.coin(x, 3.6));
  for (let i = 0; i < 120; i++) f.step();
  assert.equal(f.awards.length, 0);
  assert.equal(f.board.getDebugState().misses, 2);
  assert.equal(f.board.getDebugState().activeDrops, 0);
  for (const coin of coins) {
    assert.ok(coin.body.translation().z > PLINKO_Z + 0.4);
    assert.ok(Math.abs(coin.body.mass() - coin.mass) < 0.00001);
    assert.equal(coin.collider.shape.type, RAPIER.ShapeType.Cylinder);
  }
  f.world.free();
});

test('treasure stays latched through motion and nudges, then a shark release pays once', () => {
  const f = fixture();
  const cup = f.board.getDebugState().cups.find(cup => cup.prize === 'gem');
  const coin = f.coin(cup.x, 3.6);
  for (let i = 0; i < 120; i++) f.step();
  assert.equal(f.board.getTreasureStatus().held, true);
  assert.equal(f.awards.length, 0);
  assert.ok(f.board.contains(coin.body));
  coin.body.applyImpulse({ x: coin.mass * 0.7, y: coin.mass * 0.9, z: coin.mass * 0.6 }, true);
  for (let i = 0; i < 1200; i++) f.step(i / 60);
  assert.equal(f.board.getTreasureStatus().held, true);
  assert.equal(f.awards.length, 0);
  assert.ok(coin.body.translation().y > 3 && coin.body.translation().y < 3.4);
  assert.equal(f.board.releaseTreasure(), true);
  assert.equal(f.awards.length, 1);
  assert.equal(f.awards[0].prize, 'gem');
  assert.equal(f.board.releaseTreasure(), false);
  for (let i = 0; i < 120; i++) f.step(20 + i / 60);
  assert.equal(f.awards.length, 1);
  assert.ok(coin.body.translation().z > PLINKO_Z + 0.4);
  assert.equal(coin.collider.shape.type, RAPIER.ShapeType.Cylinder);
  assert.equal(f.board.getTreasureStatus().held, false);
  f.world.free();
});

test('moving pegs deflect a dropped coin without numerical explosions', () => {
  const f = fixture();
  const { body } = f.coin(0.06, 5.47);
  let maxSpeed = 0;
  for (let i = 0; i < 240; i++) {
    f.step(i / 60);
    const velocity = body.linvel();
    // After exiting there is no bed in this fixture, so the free fall accelerates normally.
    if (f.board.contains(body)) maxSpeed = Math.max(maxSpeed, Math.hypot(velocity.x, velocity.y, velocity.z));
  }
  assert.ok(f.board.getDebugState().pegHits >= 2);
  assert.ok(Math.abs(body.translation().x - 0.06) > 0.1);
  assert.ok(maxSpeed < 12);
  assert.equal(f.board.getDebugState().activeDrops, 0);
  f.world.free();
});
