import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface Swimmer { mesh: THREE.Group; tail: THREE.Group; phase: number; speed: number; radius: number; height: number }

export class OceanLife {
  private fish: Swimmer[] = [];
  private shark: THREE.Group;
  private sharkTail: THREE.Group;
  private elapsed = 0;
  private nextVisit = 20 + Math.random() * 5;
  private visitTime = 0;
  private phase: 'away' | 'approaching' | 'leaving' = 'away';
  private bumps = 0;

  constructor(scene: THREE.Scene, private onApproach: () => void, private onBump: () => void) {
    const colors = [0xf2c876, 0x77d8c1, 0xf0a285, 0x73b6d5];
    for (let i = 0; i < 11; i++) {
      const { mesh, tail } = this.makeFish(colors[i % colors.length]);
      mesh.scale.setScalar(0.8 + (i % 3) * 0.24);
      scene.add(mesh);
      this.fish.push({ mesh, tail, phase: i * Math.PI * 2 / 11, speed: (i % 2 ? -1 : 1) * (0.1 + i % 3 * 0.026), radius: 5.8 + i % 3 * 0.7, height: 1.8 + (i * 1.27) % 4.7 });
    }
    const shark = this.makeShark();
    this.shark = shark.mesh; this.sharkTail = shark.tail;
    this.shark.visible = false; scene.add(this.shark);
    this.moveFish();
  }

  private material(color: number) { return new THREE.MeshStandardMaterial({ color, metalness: 0.12, roughness: 0.48 }); }

  private ellipsoid(parent: THREE.Object3D, scale: number[], position: number[], material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material);
    mesh.scale.set(...scale as [number, number, number]); mesh.position.set(...position as [number, number, number]);
    parent.add(mesh); return mesh;
  }

  private fin(parent: THREE.Object3D, points: number[][], material: THREE.Material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3)); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material); parent.add(mesh); return mesh;
  }

  private makeFish(color: number) {
    const mesh = new THREE.Group();
    const body = this.material(color);
    const fins = new THREE.MeshStandardMaterial({ color, roughness: 0.5, side: THREE.DoubleSide });
    this.ellipsoid(mesh, [0.39, 0.2, 0.115], [0, 0, 0], body);
    this.fin(mesh, [[0.1, 0.13, 0], [-0.15, 0.34, 0], [-0.25, 0.08, 0]], fins);
    for (const side of [-1, 1]) {
      this.ellipsoid(mesh, [0.044, 0.05, 0.016], [0.23, 0.055, side * 0.097], this.material(0xf3ead1));
      this.ellipsoid(mesh, [0.025, 0.03, 0.011], [0.245, 0.053, side * 0.111], this.material(0x07232c));
      this.fin(mesh, [[0.03, -0.04, side * 0.08], [-0.16, -0.18, side * 0.22], [-0.18, 0.03, side * 0.08]], fins);
    }
    const tail = new THREE.Group(); tail.position.x = -0.32; mesh.add(tail);
    this.fin(tail, [[0.04, 0, 0], [-0.29, 0.22, 0], [-0.24, -0.22, 0]], fins);
    // Two pale bands read clearly at the fish's small screen size.
    for (const x of [-0.13, 0.05]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.177, 0.02, 6, 20), this.material(0xd6e5c3));
      band.rotation.y = Math.PI / 2; band.scale.x = 0.62; band.position.x = x; mesh.add(band);
    }
    // Keep each fish to two draw calls: its colored body and its animated tail.
    const staticParts = mesh.children.filter(child => child !== tail) as THREE.Mesh[];
    const geometries = staticParts.map(part => {
      part.updateMatrix();
      const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
      geometry.applyMatrix4(part.matrix); geometry.deleteAttribute('uv');
      const color = (part.material as THREE.MeshStandardMaterial).color;
      const colors = new Float32Array(geometry.getAttribute('position').count * 3);
      for (let i = 0; i < colors.length; i += 3) { colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b; }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return geometry;
    });
    const combined = mergeGeometries(geometries)!;
    staticParts.forEach(part => { mesh.remove(part); part.geometry.dispose(); });
    geometries.forEach(geometry => geometry.dispose());
    mesh.add(new THREE.Mesh(combined, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.12, side: THREE.DoubleSide })));
    return { mesh, tail };
  }

  private makeShark() {
    const mesh = new THREE.Group();
    const skin = this.material(0x6397aa);
    const belly = this.material(0xc5dfd6);
    const finMaterial = new THREE.MeshStandardMaterial({ color: 0x527f93, roughness: 0.46, side: THREE.DoubleSide });
    const profile = [[0.025, -1.23], [0.17, -0.9], [0.33, -0.5], [0.42, 0], [0.32, 0.6], [0.14, 1.08], [0.025, 1.38]].map(([r, x]) => new THREE.Vector2(r, x));
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), skin);
    body.rotation.z = -Math.PI / 2; body.castShadow = true; mesh.add(body);
    this.ellipsoid(mesh, [0.99, 0.21, 0.335], [0.13, -0.16, 0], belly);
    this.fin(mesh, [[0.38, 0.29, 0], [-0.16, 1.02, 0], [-0.51, 0.24, 0]], finMaterial);
    for (const side of [-1, 1]) {
      this.fin(mesh, [[0.25, -0.02, side * 0.32], [-0.59, -0.2, side * 1.02], [-0.48, -0.03, side * 0.25]], finMaterial);
      this.ellipsoid(mesh, [0.067, 0.062, 0.035], [0.9, 0.09, side * 0.217], belly);
      this.ellipsoid(mesh, [0.038, 0.041, 0.026], [0.922, 0.087, side * 0.244], this.material(0x092530));
      for (let i = 0; i < 3; i++) {
        const points = [new THREE.Vector3(0.23 + i * 0.11, 0.05, side * 0.36), new THREE.Vector3(0.18 + i * 0.11, -0.13, side * 0.34)];
        mesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x244e60 })));
      }
      const smile = new THREE.CatmullRomCurve3([new THREE.Vector3(1.18, -0.07, side * 0.12), new THREE.Vector3(0.98, -0.16, side * 0.21), new THREE.Vector3(0.65, -0.19, side * 0.27)]);
      mesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(smile.getPoints(16)), new THREE.LineBasicMaterial({ color: 0x284958 })));
    }
    const tail = new THREE.Group(); tail.position.x = -1.08; mesh.add(tail);
    this.fin(tail, [[0.05, 0, 0], [-0.68, 0.77, 0], [-0.46, -0.16, 0]], finMaterial);
    this.fin(tail, [[0.05, 0, 0], [-0.46, -0.16, 0], [-0.65, -0.51, 0]], finMaterial);
    return { mesh, tail };
  }

  private moveFish() {
    for (const fish of this.fish) {
      const angle = fish.phase + this.elapsed * fish.speed;
      fish.mesh.position.set(Math.cos(angle) * fish.radius, fish.height + Math.sin(this.elapsed * 0.9 + fish.phase) * 0.22, Math.sin(angle) * 5.4);
      const dx = -Math.sin(angle) * fish.radius * fish.speed;
      const dz = Math.cos(angle) * 5.4 * fish.speed;
      fish.mesh.rotation.y = Math.atan2(-dz, dx);
      fish.mesh.rotation.z = Math.sin(this.elapsed * 1.1 + fish.phase) * 0.035;
      fish.tail.rotation.y = Math.sin(this.elapsed * 8 + fish.phase) * 0.5;
    }
  }

  update(delta: number) {
    this.elapsed += delta;
    this.moveFish();
    if (this.phase === 'away' && this.elapsed >= this.nextVisit) {
      this.phase = 'approaching'; this.visitTime = 0; this.shark.visible = true;
      this.onApproach();
    }
    if (this.phase === 'away') return;
    this.visitTime += delta;
    this.sharkTail.rotation.y = Math.sin(this.elapsed * 8.5) * 0.32;
    if (this.phase === 'approaching') {
      const t = Math.min(1, this.visitTime / 4.2);
      this.shark.rotation.y = Math.PI;
      // The nose stops at x = 3.87, the cabinet's outer right wall.
      this.shark.position.set(10.6 - 5.35 * t, 3.55 + Math.sin(t * Math.PI) * 0.35, 1.3);
      if (t === 1) {
        this.bumps++; this.onBump(); this.phase = 'leaving'; this.visitTime = 0;
      }
    } else {
      const t = Math.min(1, this.visitTime / 5);
      this.shark.rotation.y = Math.PI * (1 - THREE.MathUtils.smoothstep(t, 0.06, 0.34));
      this.shark.position.set(5.25 + t * 7.8, 3.55 + Math.sin(t * Math.PI * 0.5) * 1.2, 1.3 + Math.sin(t * Math.PI) * 0.8);
      if (t === 1) {
        this.phase = 'away'; this.shark.visible = false; this.nextVisit = this.elapsed + 38 + Math.random() * 20;
      }
    }
  }

  getDebugState() {
    return { fishCount: this.fish.length, fishPositions: this.fish.map(fish => fish.mesh.position.toArray()), sharkPhase: this.phase, sharkVisible: this.shark.visible, sharkPosition: this.shark.position.toArray(), bumps: this.bumps, elapsed: this.elapsed, nextVisitIn: Math.max(0, this.nextVisit - this.elapsed) };
  }
}
