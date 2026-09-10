import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export const PLINKO_Z = -1.35;
const RADIUS = 0.235;
const FLOOR_Y = 2.96;
export type Prize = 'gem';

interface Cup {
  prize: Prize;
  body: RAPIER.RigidBody;
  floor: RAPIER.Collider;
  mesh: THREE.Group;
  light: THREE.MeshStandardMaterial;
  width: number;
  home: number;
  phase: number;
}

interface Drop {
  id: number;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  entryX: number;
  pegHits: number;
  contacts: Set<number>;
  cup?: Cup;
  settledFor: number;
  mass: number;
}

/** Coins remain between the board's guide plates until they leave its bottom.
 * Pegs, cup walls, and cup floors are solid Rapier colliders. No proximity sensors award prizes.
 */
export class PlinkoBoard {
  private pegs = new Set<number>();
  private movingRows: { body: RAPIER.RigidBody; mesh: THREE.Group; amplitude: number; speed: number; phase: number }[] = [];
  private cups: Cup[] = [];
  private drops = new Map<number, Drop>();
  private nextId = 1;
  private pegHits = 0;
  private misses = 0;
  private treasureLabels!: { openLabel: THREE.Mesh; heldLabel: THREE.Mesh };
  private captured?: { drop: Drop; cup: Cup; joint: RAPIER.ImpulseJoint };
  private landings: { id: number; prize: Prize | null; pegHits: number; entryX: number; exitX: number; y: number; floorContact: boolean }[] = [];

  constructor(
    private world: RAPIER.World,
    private parent: THREE.Group,
    private onPrize: (prize: Prize, at: THREE.Vector3) => void,
    private onPeg: () => void,
    private onTreasureCaught: () => void = () => {},
  ) {
    this.build();
  }

  private box(size: number[], position: number[], material: THREE.Material, parent: THREE.Object3D = this.parent) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), material);
    mesh.position.set(...position as [number, number, number]);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    return mesh;
  }

  private label(text: string, width: number, height: number, color: string) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${text.length > 4 ? 76 : 200}px "Barlow Condensed", sans-serif`; ctx.fillText(text, 256, 130);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  }

  private build() {
    const brass = new THREE.MeshStandardMaterial({ color: 0xcba66a, metalness: 0.7, roughness: 0.32 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x103e43, metalness: 0.25, roughness: 0.5 });
    const panel = new THREE.MeshStandardMaterial({ color: 0x0b3a40, transparent: true, opacity: 0.86, roughness: 0.6 });
    this.box([6.42, 2.65, 0.04], [0, 4.2, PLINKO_Z - 0.18], panel);
    for (const x of [-3.25, 3.25]) {
      this.box([0.09, 2.64, 0.36], [x, 4.2, PLINKO_Z], brass);
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.045, 1.32, 0.18).setTranslation(x, 4.2, PLINKO_Z).setFriction(0.08).setRestitution(0.3));
    }
    const title = this.label('R E E F  D R O P', 2.65, 0.22, '#d7ecd1');
    title.position.set(0, 5.32, PLINKO_Z - 0.13); this.parent.add(title);

    const orientation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const pegGeometry = new THREE.CylinderGeometry(0.068, 0.068, 0.25, 14);
    const capGeometry = new THREE.SphereGeometry(0.08, 10, 8);
    for (let row = 0; row < 3; row++) {
      const group = new THREE.Group(); group.position.set(0, 4.98 - row * 0.56, PLINKO_Z); this.parent.add(group);
      const moving = row > 0;
      const descriptor = moving ? RAPIER.RigidBodyDesc.kinematicPositionBased() : RAPIER.RigidBodyDesc.fixed();
      const body = this.world.createRigidBody(descriptor.setTranslation(0, group.position.y, PLINKO_Z));
      if (moving) this.movingRows.push({ body, mesh: group, amplitude: row === 1 ? 0.3 : 0.22, speed: row === 1 ? 1.5 : 1.05, phase: row * 1.8 });
      const cap = new THREE.MeshStandardMaterial({ color: moving ? 0x8be5c3 : 0xf2cf83, emissive: moving ? 0x62dcb4 : 0xa17725, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.35 });
      if (moving) this.box([5.7, 0.025, 0.04], [0, 0, -0.13], brass, group);
      const count = row === 1 ? 6 : 7;
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * 0.9;
        const peg = new THREE.Mesh(pegGeometry, brass); peg.quaternion.copy(orientation); peg.position.x = x; group.add(peg);
        const glow = new THREE.Mesh(capGeometry, cap); glow.position.set(x, 0, 0.15); group.add(glow);
        const collider = this.world.createCollider(RAPIER.ColliderDesc.ball(0.068).setTranslation(x, 0, 0).setFriction(0.06).setRestitution(0.66), body);
        this.pegs.add(collider.handle);
      }
    }

    // Only the small treasure cup remains; the rest of the board exits onto the bed.
    this.box([6.35, 0.035, 0.05], [0, FLOOR_Y - 0.06, PLINKO_Z - 0.15], brass);
    const prizes: Prize[] = ['gem'];
    prizes.forEach(prize => {
      const width = 0.77;
      const home = 0;
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(home, FLOOR_Y, PLINKO_Z));
      const mesh = new THREE.Group(); mesh.position.set(home, FLOOR_Y, PLINKO_Z); this.parent.add(mesh);
      const color = 0xf4a58e;
      const light = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.4 });
      this.box([width, 0.09, 0.32], [0, 0, 0], light, mesh);
      const floor = this.world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, 0.045, 0.16).setFriction(0.65).setRestitution(0), body);
      for (const side of [-1, 1]) {
        const x = side * (width / 2 - 0.04);
        this.box([0.08, 0.4, 0.32], [x, 0.24, 0], light, mesh);
        this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.04, 0.2, 0.16).setTranslation(x, 0.24, 0).setFriction(0.1).setRestitution(0.15), body);
      }
      this.box([width - 0.16, 0.19, 0.025], [0, -0.11, 0.18], dark, mesh);
      const label = this.label('◆', width * 0.72, 0.24, `#${color.toString(16)}`);
      label.position.set(0, -0.11, 0.2); mesh.add(label);
      const openLabel = this.label('OPEN', width * 0.85, 0.14, '#b3ffcd');
      const heldLabel = this.label('HELD', width * 0.85, 0.14, '#edc888');
      for (const status of [openLabel, heldLabel]) { status.position.set(0, 0.13, 0.21); mesh.add(status); }
      this.treasureLabels = { openLabel, heldLabel };
      this.cups.push({ prize, body, floor, mesh, light, width, home, phase: 2.1 });
    });
  }

  enter(body: RAPIER.RigidBody, collider: RAPIER.Collider) {
    // Guide plates keep the token upright while it plinks; it regains all 6 axes on exit.
    // In this constrained plane a sphere has the token's exact circular cross-section.
    // It avoids degenerate thin-cylinder contacts while preserving the token's mass.
    const mass = body.mass();
    collider.setShape(new RAPIER.Ball(RADIUS));
    collider.setMass(mass);
    body.recomputeMassPropertiesFromColliders();
    body.setEnabledTranslations(true, true, false, true);
    body.setEnabledRotations(false, false, true, true);
    body.setGravityScale(0.62, true);
    this.drops.set(body.handle, { id: this.nextId++, body, collider, entryX: body.translation().x, pegHits: 0, contacts: new Set(), settledFor: 0, mass });
  }

  beforeStep(time: number) {
    this.syncTreasureLabels();
    for (const row of this.movingRows) {
      row.body.setNextKinematicTranslation({ x: Math.sin(time * row.speed + row.phase) * row.amplitude, y: row.mesh.position.y, z: PLINKO_Z });
    }
    for (const cup of this.cups) {
      cup.body.setNextKinematicTranslation({ x: cup.home + Math.sin(time * 1.3 + cup.phase) * 0.68, y: FLOOR_Y, z: PLINKO_Z });
    }
  }

  private touching(a: RAPIER.Collider, b: RAPIER.Collider) {
    let contact = false;
    this.world.contactPair(a, b, manifold => { if (manifold.numSolverContacts() > 0) contact = true; });
    return contact;
  }

  afterStep(delta: number) {
    for (const row of this.movingRows) row.mesh.position.copy(row.body.translation());
    for (const cup of this.cups) {
      cup.mesh.position.copy(cup.body.translation());
      cup.light.emissiveIntensity = THREE.MathUtils.lerp(cup.light.emissiveIntensity, 0.4, delta * 3);
    }
    for (const drop of this.drops.values()) {
      if (!drop.body.isValid()) { this.drops.delete(drop.body.handle); continue; }
      if (this.captured?.drop === drop) continue;
      const p = drop.body.translation();
      const contacts = new Set<number>();
      // Finish the broad query before querying manifolds: Rapier forbids nested WASM borrows.
      const candidates: RAPIER.Collider[] = [];
      this.world.contactPairsWith(drop.collider, other => { if (this.pegs.has(other.handle)) candidates.push(other); });
      for (const other of candidates) {
        if (!this.touching(drop.collider, other)) continue;
        contacts.add(other.handle);
        if (!drop.contacts.has(other.handle)) { drop.pegHits++; this.pegHits++; this.onPeg(); }
      }
      drop.contacts = contacts;

      let landed: Cup | undefined;
      for (const cup of this.cups) {
        const inside = Math.abs(p.x - cup.body.translation().x) < cup.width / 2 - 0.08 - RADIUS + 0.018;
        if (inside && p.y < FLOOR_Y + 0.34 && Math.abs(drop.body.linvel().y) < 0.6 && this.touching(drop.collider, cup.floor)) {
          landed = cup; break;
        }
      }
      drop.settledFor = landed && landed === drop.cup ? drop.settledFor + delta : 0;
      drop.cup = landed;
      if (landed && drop.settledFor >= 0.08) {
        landed.light.emissiveIntensity = 4;
        if (!this.captured) {
          // The cup's mechanical latch holds this actual token until a shark hits it.
          const joint = this.world.createImpulseJoint(RAPIER.JointData.fixed(
            { x: p.x - landed.body.translation().x, y: p.y - FLOOR_Y, z: 0 }, drop.body.rotation(),
            { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0, w: 1 }), landed.body, drop.body, true);
          this.captured = { drop, cup: landed, joint };
          this.syncTreasureLabels();
          this.onTreasureCaught();
        } else this.finish(drop, null);
      } else if (p.y < 2.86) this.finish(drop, null);
    }
  }

  private finish(drop: Drop, prize: Prize | null) {
    const p = drop.body.translation();
    this.landings.push({ id: drop.id, prize, pegHits: drop.pegHits, entryX: drop.entryX, exitX: p.x, y: p.y, floorContact: prize !== null });
    if (this.landings.length > 60) this.landings.shift();
    if (prize === null) this.misses++;
    this.drops.delete(drop.body.handle);
    drop.collider.setShape(new RAPIER.Cylinder(0.042, RADIUS));
    drop.collider.setMass(drop.mass);
    drop.body.recomputeMassPropertiesFromColliders();
    drop.body.setEnabledTranslations(true, true, true, true);
    drop.body.setEnabledRotations(true, true, true, true);
    drop.body.setGravityScale(1, true);
    // A short mechanical ejector clears the cup's front lip onto the pusher.
    drop.body.applyImpulse({ x: 0, y: 0, z: drop.body.mass() * 1.8 }, true);
    drop.body.setAngvel({ x: 1.3, y: 0, z: drop.body.angvel().z }, true);
  }

  contains(body: RAPIER.RigidBody) { return this.drops.has(body.handle); }
  forget(body: RAPIER.RigidBody) { this.drops.delete(body.handle); }
  private syncTreasureLabels() {
    const held = !!this.captured;
    this.treasureLabels.openLabel.visible = !held;
    this.treasureLabels.heldLabel.visible = held;
  }

  releaseTreasure() {
    if (!this.captured) return false;
    const { drop, joint } = this.captured;
    const p = drop.body.translation();
    this.world.removeImpulseJoint(joint, true);
    this.captured = undefined;
    this.syncTreasureLabels();
    this.finish(drop, 'gem');
    this.onPrize('gem', new THREE.Vector3(p.x, p.y, p.z));
    return true;
  }

  getTreasureStatus() { return { held: !!this.captured }; }

  getDebugState() {
    return {
      activeDrops: this.drops.size, pegHits: this.pegHits, misses: this.misses,
      treasure: this.getTreasureStatus(),
      landings: this.landings.map(landing => ({ ...landing })),
      cups: this.cups.map(cup => ({ prize: cup.prize, x: cup.body.translation().x, width: cup.width })),
      movingRows: this.movingRows.map(row => row.body.translation().x),
    };
  }
}
