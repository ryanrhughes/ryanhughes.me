import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ArcadeAudio } from './audio';
import { PlinkoBoard, PLINKO_Z } from './plinko';
import { OceanLife } from './ocean';
import { ArcadeRun, type RunState } from './run';

export interface GameState extends RunState {
  tilt: number;
  treasureHeld: boolean;
  dropReadyIn: number;
}

export const TILT_COST = 10;
export const DROP_INTERVAL = 0.8;

interface Callbacks {
  onState: (state: GameState) => void;
  onMessage: (title: string, subtitle?: string, type?: string) => void;
  onWin: (value: number) => void;
}

interface Coin {
  body: RAPIER.RigidBody;
  age: number;
  previous: THREE.Vector3;
  previousVerticalVelocity: number;
}

interface Particle { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; maxLife: number }

const COIN_RADIUS = 0.235;
const COIN_HALF_HEIGHT = 0.042;
const MAX_COINS = 420;
const STEP = 1 / 60;
const palette = { mint: 0x7de7c0, gold: 0xf1c675, coral: 0xed9b81 };

export class CoinPusher {
  readonly audio = new ArcadeAudio();
  private run: ArcadeRun;
  private state: GameState;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  private world: RAPIER.World;
  private machine = new THREE.Group();
  private coins: Coin[] = [];
  private coinMesh: THREE.InstancedMesh;
  private pusher!: RAPIER.RigidBody;
  private pusherMesh!: THREE.Group;
  private plinko!: PlinkoBoard;
  private ocean!: OceanLife;
  private lastSharkImpact?: { at: number; coinsAffected: number; impulse: number };
  private chute = new THREE.Group();
  private chuteLight!: THREE.MeshStandardMaterial;
  private chuteToken!: THREE.Mesh;
  private bulbs: THREE.Mesh[] = [];
  private particles: Particle[] = [];
  private particleGeometry = new THREE.IcosahedronGeometry(0.035, 0);
  private particleMaterials = new Map<number, THREE.MeshBasicMaterial>();
  private bubbles: THREE.Mesh[] = [];
  private aim = 0;
  private time = 0;
  private accumulator = 0;
  private lastTime = 0;
  private dropCooldown = 0;
  private recentDrops: { time: number; x: number }[] = [];
  private clinkCooldown = 0;
  private autoDrop = false;
  private autoTimer = 0;
  private nudgeTimes: number[] = [];
  private shake = 0;
  private cameraMode = 0;
  private ready = false;
  private paused = false;
  private payoutPending = 0;
  private payoutTimer = 0;
  private bonusHits = 0;
  private lostCoins = 0;
  private dummy = new THREE.Object3D();
  private resizeObserver: ResizeObserver;

  static async create(container: HTMLElement, callbacks: Callbacks, bestScore = 0) {
    await RAPIER.init();
    await Promise.race([document.fonts.load('900 125px "Barlow Condensed"'), new Promise(resolve => setTimeout(resolve, 1800))]);
    const game = new CoinPusher(container, callbacks, bestScore);
    game.buildMachine();
    game.seedCoins();
    // Settle the initial bed before revealing the cabinet, without crediting free wins.
    for (let i = 0; i < 100; i++) game.world.step();
    // Run two complete pusher cycles so the ready-to-play pile is stable.
    for (let i = 0; i < 560; i++) game.stepPhysics();
    game.ready = true;
    game.emit();
    game.animate(0);
    return game;
  }

  private constructor(private container: HTMLElement, private callbacks: Callbacks, bestScore: number) {
    this.run = new ArcadeRun(bestScore);
    this.state = Object.assign(this.run.state, { tilt: 0, treasureHeld: false, dropReadyIn: 0 });
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.numSolverIterations = 8;
    this.world.integrationParameters.normalizedAllowedLinearError = 0.001;
    this.world.timestep = STEP;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', '3D deep sea coin pusher. Time your drop as the chute moves from side to side.');
    this.renderer.domElement.setAttribute('role', 'img');

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.7;
    room.dispose();
    pmrem.dispose();
    this.scene.add(this.machine);
    this.scene.add(new THREE.HemisphereLight(0xc9fff0, 0x182334, 1.6));
    const key = new THREE.DirectionalLight(0xffe1b5, 3.0);
    key.position.set(3, 11, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x78f2d0, 2.8);
    rim.position.set(-7, 6, -4);
    this.scene.add(rim);
    const fill = new THREE.PointLight(0x73ebc2, 30, 11, 2);
    fill.position.set(0, 5.7, 0.4);
    this.scene.add(fill);

    const coinTexture = this.makeCoinTexture();
    const edge = new THREE.MeshStandardMaterial({ color: 0xe7b956, metalness: 0.82, roughness: 0.3 });
    const face = new THREE.MeshStandardMaterial({ map: coinTexture, color: 0xffe2a0, metalness: 0.75, roughness: 0.32 });
    this.coinMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, COIN_HALF_HEIGHT * 2, 24), [edge, face, face], MAX_COINS);
    this.coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinMesh.castShadow = true;
    this.coinMesh.receiveShadow = true;
    this.coinMesh.frustumCulled = false;
    this.machine.add(this.coinMesh);

    this.camera.position.set(6.8, 8.2, 17.7);
    this.camera.lookAt(0, 3.5, 0);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    document.addEventListener('visibilitychange', () => { this.lastTime = 0; this.accumulator = 0; });
  }

  private resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    // Keep the whole cabinet in view on narrow portrait screens.
    this.camera.fov = width / height < 0.8 ? 44 : width / height < 1.1 ? 39 : 35;
    this.camera.updateProjectionMatrix();
  }

  private material(color: number, metalness = 0.4, roughness = 0.35) {
    return new THREE.MeshStandardMaterial({ color, metalness, roughness });
  }

  private box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = this.machine, radius = 0) {
    const geometry = radius ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private fixedBox(w: number, h: number, d: number, x: number, y: number, z: number, friction = 0.38) {
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z).setFriction(friction).setRestitution(0.04));
  }

  private texture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d')!);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    return texture;
  }

  private makeCoinTexture() {
    return this.texture(256, 256, ctx => {
      ctx.fillStyle = '#e8ca84'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#b38a42'; ctx.lineWidth = 4;
      [111, 96].forEach(r => { ctx.beginPath(); ctx.arc(128, 128, r, 0, Math.PI * 2); ctx.stroke(); });
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(128 + Math.cos(a) * 115, 128 + Math.sin(a) * 115); ctx.lineTo(128 + Math.cos(a) * 123, 128 + Math.sin(a) * 123); ctx.stroke();
      }
      ctx.fillStyle = '#ac823e'; ctx.font = 'bold 110px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✦', 130, 126);
      ctx.fillStyle = '#ffe2a2'; ctx.fillText('✦', 127, 123);
      ctx.fillStyle = '#ad8849'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('POCKET ARCADE', 128, 196);
    });
  }

  private buildMachine() {
    const shell = this.material(0x18544f, 0.55, 0.3);
    const dark = this.material(0x082f33, 0.55, 0.3);
    const brass = this.material(0xcba66a, 0.8, 0.29);
    const chrome = this.material(0x80aba4, 0.8, 0.25);
    const bed = this.material(0x426b67, 0.65, 0.33);
    const black = this.material(0x051d25, 0.25, 0.55);
    const neon = new THREE.MeshStandardMaterial({ color: 0x8fffd2, emissive: 0x64ffc7, emissiveIntensity: 2.5, roughness: 0.4 });
    const warm = new THREE.MeshStandardMaterial({ color: 0xffe1a0, emissive: 0xffb74f, emissiveIntensity: 1.8 });

    // Grounding shadow and a subtle circular pedestal.
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.2 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.16; shadow.receiveShadow = true; this.scene.add(shadow);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(5.35, 5.5, 0.16, 80), this.material(0x102d35, 0.35, 0.55));
    plinth.position.set(0, -0.08, 0.1); plinth.receiveShadow = true; this.machine.add(plinth);
    const pedestalRing = new THREE.Mesh(new THREE.TorusGeometry(5.36, 0.015, 6, 100), this.material(0x35585e, 0.2, 0.5));
    pedestalRing.rotation.x = Math.PI / 2; pedestalRing.position.y = 0.012; this.machine.add(pedestalRing);

    // Cabinet base, the open prize tray, and the front apron.
    this.box(7.8, 1.22, 6.25, 0, 0.7, 0.2, dark, this.machine, 0.2);
    this.box(7.96, 0.18, 6.36, 0, 0.24, 0.2, brass, this.machine, 0.07);
    this.box(7.86, 0.14, 6.3, 0, 1.25, 0.2, brass, this.machine, 0.04);
    this.box(7.65, 0.92, 0.16, 0, 0.78, 3.35, shell, this.machine, 0.05);
    this.box(3.5, 0.63, 0.15, 0, 0.8, 3.455, brass, this.machine, 0.08);
    this.box(3.29, 0.46, 0.17, 0, 0.84, 3.55, black, this.machine, 0.06);
    this.box(3.25, 0.08, 0.42, 0, 0.59, 3.67, chrome, this.machine, 0.025);
    this.box(3.02, 0.025, 0.08, 0, 1.055, 3.65, neon);
    for (const x of [-3.15, 3.15]) {
      this.box(0.48, 0.48, 0.035, x, 0.79, 3.45, dark, this.machine, 0.08);
      for (let i = 0; i < 4; i++) this.box(0.3, 0.025, 0.025, x, 0.66 + i * 0.085, 3.475, brass);
    }
    this.addSign('COLLECT YOUR TREASURE', 0, 0.36, 3.43, 2.6, 0.2, '#bdd8c7', '#123d3d', 26);

    // Floor and side gutters. Only the front opening awards coins.
    this.box(7.3, 0.16, 5.25, 0, 1.75, 0, black);
    this.box(6.58, 0.2, 4.95, 0, 1.96, 0.025, bed);
    this.fixedBox(6.58, 0.2, 4.95, 0, 1.96, 0.025, 0.31);
    this.box(6.59, 0.06, 0.09, 0, 2.045, 2.5, brass);
    for (const x of [-3.48, 3.48]) {
      this.box(0.32, 0.04, 4.97, x, 1.82, 0.02, black);
      for (let i = 0; i < 14; i++) this.box(0.31, 0.04, 0.025, x, 1.85, -2.2 + i * 0.35, chrome);
    }
    this.fixedBox(0.16, 4, 5.9, -3.73, 3.4, 0.02, 0.2);
    this.fixedBox(0.16, 4, 5.9, 3.73, 3.4, 0.02, 0.2);
    this.fixedBox(7.4, 4, 0.2, 0, 3.5, -2.68);

    // Sliding upper shelf: this kinematic rigid body actually pushes the coin pile.
    this.pusher = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 2.24, -1.49));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(3.55, 0.18, 1.06).setFriction(0.58).setRestitution(0.015), this.pusher);
    this.pusherMesh = new THREE.Group(); this.pusherMesh.position.set(0, 2.24, -1.49); this.machine.add(this.pusherMesh);
    this.box(7.1, 0.36, 2.12, 0, 0, 0, bed, this.pusherMesh, 0.035);
    this.box(7.1, 0.1, 0.05, 0, -0.02, 1.08, brass, this.pusherMesh);
    this.box(6.9, 0.035, 0.06, 0, -0.145, 1.1, neon, this.pusherMesh);
    for (let i = 0; i < 20; i++) this.box(0.025, 0.15, 0.018, -3.3 + i * 0.35, 0.05, 1.096, chrome, this.pusherMesh);

    // Tall backboard with original underwater illustration.
    this.box(7.75, 4.58, 0.45, 0, 4.3, -2.91, dark, this.machine, 0.15);
    this.box(7.24, 3.84, 0.04, 0, 4.31, -2.65, brass, this.machine, 0.06);
    const underwater = this.texture(1536, 900, ctx => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 900); gradient.addColorStop(0, '#23756c'); gradient.addColorStop(0.55, '#14534f'); gradient.addColorStop(1, '#092f37'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1536, 900);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(130,240,196,${0.025 + (i % 3) * 0.012})`; ctx.beginPath(); ctx.moveTo(800, -200); ctx.lineTo(i * 210 - 500, 900); ctx.lineTo(i * 210 - 410, 900); ctx.fill(); }
      ctx.strokeStyle = '#91d0ae36'; ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) { const x = (i * 257 + 133) % 1536; const y = (i * 197 + 61) % 830; ctx.beginPath(); ctx.arc(x, y, 4 + i % 13, 0, Math.PI * 2); ctx.stroke(); }
      for (let i = 0; i < 24; i++) { const x = i * 71; const h = 65 + (i * 49) % 180; ctx.fillStyle = i % 2 ? '#1b777057' : '#104846'; ctx.beginPath(); ctx.moveTo(x, 900); ctx.bezierCurveTo(x - 75, 900 - h, x + 65, 860 - h, x + 20, 820 - h); ctx.bezierCurveTo(x + 95, 840 - h, x + 15, 900 - h, x + 45, 900); ctx.fill(); }
      const fish = (x: number, y: number, size: number) => { ctx.fillStyle = '#8cd7b725'; ctx.beginPath(); ctx.ellipse(x, y, size, size * 0.36, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + size * 0.7, y); ctx.lineTo(x + size * 1.45, y - size * 0.5); ctx.lineTo(x + size * 1.45, y + size * 0.5); ctx.fill(); };
      [[210, 220, 45], [325, 265, 30], [1190, 480, 50], [1320, 530, 30], [235, 640, 35]].forEach(v => fish(v[0], v[1], v[2]));
      ctx.fillStyle = '#bbd7af'; ctx.textAlign = 'center'; ctx.font = '600 20px sans-serif'; ctx.letterSpacing = '5px'; ctx.fillText('FORTUNE FAVORS THE BOLD', 768, 100);
      ctx.font = '500 19px sans-serif'; ctx.fillStyle = '#c6dfbda0'; ctx.fillText('D R O P  I N .  D I V E  D E E P .', 768, 818);
    });
    this.box(7.12, 3.72, 0.025, 0, 4.31, -2.617, new THREE.MeshStandardMaterial({ map: underwater, roughness: 0.85, emissiveMap: underwater, emissive: 0xffffff, emissiveIntensity: 0.22 }));

    // Glass side panels, brass uprights and illuminated trim.
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x9debd7, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.15, side: THREE.DoubleSide, depthWrite: false });
    for (const side of [-1, 1]) {
      const x = side * 3.78;
      this.box(0.23, 4.69, 0.26, x, 3.71, 2.85, shell, this.machine, 0.07);
      this.box(0.065, 4.2, 0.06, x + side * 0.01, 3.87, 3.001, brass);
      this.box(0.055, 4.1, 0.065, x - side * 0.08, 3.89, 3.00, neon);
      this.box(0.22, 4.7, 0.2, x, 3.72, -2.6, brass, this.machine, 0.04);
      this.box(0.045, 3.97, 5.28, x, 3.97, 0.13, glass);
      this.box(0.2, 0.16, 5.65, x, 1.99, 0.13, shell, this.machine, 0.04);
      this.box(0.2, 0.2, 5.65, x, 6.03, 0.13, brass, this.machine, 0.04);
      // Etched diagonal glass highlight.
      const sheen = this.box(0.048, 2.7, 0.035, x - side * 0.03, 4.13, 0.6, new THREE.MeshBasicMaterial({ color: 0xa4ddcc, transparent: true, opacity: 0.21, depthWrite: false }));
      sheen.rotation.x = -0.4;
    }
    this.box(7.7, 0.11, 0.16, 0, 2.01, 2.91, shell, this.machine, 0.03);
    // Low front glass gives an unobstructed view of falling coins.
    this.box(7.32, 0.65, 0.035, 0, 2.42, 2.91, glass);
    this.box(7.43, 0.055, 0.07, 0, 2.75, 2.91, chrome, this.machine, 0.015);

    // The marquee sits above the backboard; an open front keeps the chute visible.
    this.box(8.12, 0.3, 1.36, 0, 6.24, -2.24, shell, this.machine, 0.11);
    this.box(8.2, 0.11, 1.44, 0, 6.36, -2.24, brass, this.machine, 0.04);
    this.box(8.04, 1.11, 0.64, 0, 6.77, -1.98, dark, this.machine, 0.18);
    this.box(7.76, 0.92, 0.14, 0, 6.78, -1.62, brass, this.machine, 0.1);
    const marquee = this.texture(1536, 256, ctx => {
      ctx.fillStyle = '#103c3c'; ctx.fillRect(0, 0, 1536, 256);
      ctx.strokeStyle = '#90bc9040'; ctx.lineWidth = 2; ctx.strokeRect(18, 17, 1500, 222);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#a8d8bb'; ctx.font = '500 23px sans-serif'; ctx.letterSpacing = '10px'; ctx.fillText('D E E P  S E A', 770, 48);
      ctx.letterSpacing = '4px'; ctx.font = '900 125px "Barlow Condensed", Impact, sans-serif';
      ctx.fillStyle = '#977138'; ctx.fillText('GOLD RUSH', 772, 144); ctx.fillStyle = '#f6d38b'; ctx.fillText('GOLD RUSH', 768, 138);
      ctx.letterSpacing = '3px'; ctx.font = '500 14px sans-serif'; ctx.fillStyle = '#a6c7a6'; ctx.fillText('A LITTLE TIMING. A LITTLE LUCK.', 768, 223);
      ctx.fillStyle = '#f2ce87'; ctx.font = '80px Georgia'; ctx.fillText('✧', 145, 132); ctx.fillText('✧', 1375, 132);
      ctx.strokeStyle = '#84bb9b66'; ctx.lineWidth = 2;
      for (const x of [270, 1266]) { ctx.beginPath(); ctx.arc(x, 130, 53, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, 130, 43, 0, Math.PI * 2); ctx.stroke(); }
    });
    this.box(7.6, 0.79, 0.04, 0, 6.79, -1.532, new THREE.MeshStandardMaterial({ map: marquee, emissiveMap: marquee, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.5 }), this.machine, 0.03);
    for (let i = 0; i < 23; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), (i % 2 ? neon : warm).clone());
      bulb.position.set(-3.7 + i * 0.337, 6.18, -1.53); this.machine.add(bulb); this.bulbs.push(bulb);
    }
    for (const side of [-1, 1]) for (let i = 0; i < 10; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.033, 6, 6), warm);
      bulb.position.set(side * 3.77, 6.04, -2.2 + i * 0.51); this.machine.add(bulb);
    }

    this.plinko = new PlinkoBoard(this.world, this.machine, (_prize, at) => this.hitTreasure(at), () => {
      if (this.clinkCooldown <= 0) { this.audio.plink(); this.clinkCooldown = 0.06; }
    }, () => {
      this.callbacks.onMessage('TREASURE CAUGHT!', 'The shark has to knock this one loose.', 'bonus');
    });
    this.ocean = new OceanLife(this.scene,
      () => { this.audio.sharkApproach(); this.callbacks.onMessage('Something big is circling…', 'Keep an eye on the starboard side.', 'warning'); },
      () => {
        this.shake = 0.3;
        const impact = this.bumpCoins(1.4, -0.65);
        this.lastSharkImpact = { at: this.time, ...impact };
        this.audio.sharkBump();
        this.burst(new THREE.Vector3(3.78, 3.5, 1.3), palette.mint, 42);
        this.callbacks.onMessage('SHARK BUMP!', 'A little help from the deep. This one’s on the house.', 'shark');
        this.plinko.releaseTreasure();
      });

    // A lit mechanical carriage runs on the pegboard's rail, below the canopy.
    // Its open slot exposes the waiting token at the real physics release point.
    this.box(6.65, 0.18, 0.15, 0, 5.68, PLINKO_Z - 0.3, dark, this.machine, 0.035);
    this.box(6.55, 0.045, 0.06, 0, 5.68, PLINKO_Z - 0.19, chrome);
    for (const side of [-1, 1]) {
      this.box(0.17, 0.39, 0.28, side * 3.25, 5.57, PLINKO_Z - 0.16, brass, this.machine, 0.035);
    }
    this.chute.position.set(0, 5.52, PLINKO_Z); this.machine.add(this.chute);
    this.box(0.86, 0.18, 0.44, 0, 0.18, 0, brass, this.chute, 0.045);
    this.box(0.64, 0.4, 0.06, 0, -0.08, -0.13, black, this.chute, 0.025);
    this.chuteLight = new THREE.MeshStandardMaterial({ color: palette.mint, emissive: palette.mint, emissiveIntensity: 2, roughness: 0.25 });
    for (const side of [-1, 1]) {
      this.box(0.13, 0.49, 0.36, side * 0.365, -0.1, 0, brass, this.chute, 0.035);
      this.box(0.055, 0.35, 0.035, side * 0.365, -0.12, 0.194, this.chuteLight, this.chute, 0.012);
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.018, 12), chrome);
      screw.rotation.x = Math.PI / 2; screw.position.set(side * 0.335, 0.18, 0.232); this.chute.add(screw);
    }
    this.addSign('1 COIN', 0, 0.18, 0.228, 0.46, 0.1, '#f4d594', '#103c3c', 67, this.chute);
    this.chuteToken = new THREE.Mesh(this.coinMesh.geometry, this.coinMesh.material);
    this.chuteToken.rotation.x = Math.PI / 2;
    this.chuteToken.position.set(0, 5.47 - this.chute.position.y, 0);
    this.chute.add(this.chuteToken);

    // A few slow bubbles outside the cabinet complete the underwater atmosphere.
    const bubbleMaterial = new THREE.MeshBasicMaterial({ color: 0x83d6bc, transparent: true, opacity: 0.12, wireframe: true });
    for (let i = 0; i < 15; i++) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.035 + i % 4 * 0.027, 10, 8), bubbleMaterial);
      bubble.position.set((i % 2 ? -1 : 1) * (4.4 + i % 3 * 0.45), i * 0.5, -1.5 - i % 3);
      this.scene.add(bubble); this.bubbles.push(bubble);
    }
  }

  private addSign(text: string, x: number, y: number, z: number, w: number, h: number, color: string, bg: string, fontSize = 42, parent: THREE.Object3D = this.machine) {
    const tex = this.texture(768, 128, ctx => {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 768, 128); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 ${fontSize}px sans-serif`; ctx.letterSpacing = '4px'; ctx.fillText(text, 384, 65);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2, roughness: 0.7 }));
    sign.position.set(x, y, z); parent.add(sign); return sign;
  }

  private seedCoins() {
    // Staggered layers leave air between the coins, so their arrangement is settled by physics.
    for (let row = 0; row < 7; row++) for (let col = 0; col < 13; col++) {
      const x = (col - 6) * 0.478 + (row % 2) * 0.09;
      const z = -0.47 + row * 0.46;
      this.addCoin(x, 2.14 + Math.random() * 0.05, z);
    }
    for (let row = 0; row < 4; row++) for (let col = 0; col < 13; col++) {
      this.addCoin((col - 6) * 0.475 + (row % 2) * 0.08, 2.5, -2.27 + row * 0.475);
    }
    for (let i = 0; i < 31; i++) {
      const x = (Math.random() - 0.5) * 5.85;
      const z = 0.1 + Math.random() * 2.16;
      this.addCoin(x, 2.37 + Math.random() * 0.1, z);
    }
  }

  private addCoin(x: number, y: number, z: number, dropped = false) {
    if (this.coins.length >= MAX_COINS) return false;
    const descriptor = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setCanSleep(true).setLinearDamping(0.12).setAngularDamping(0.22).setCcdEnabled(true);
    if (dropped) {
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      descriptor.setRotation(rotation);
      descriptor.setAngvel({ x: 0, y: 0, z: (Math.random() - 0.5) * 2 });
      descriptor.setLinvel((Math.random() - 0.5) * 0.18, -0.5, 0);
    } else {
      descriptor.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.12, Math.random() * 6.28, (Math.random() - 0.5) * 0.12)));
    }
    const body = this.world.createRigidBody(descriptor);
    const collider = this.world.createCollider(RAPIER.ColliderDesc.cylinder(COIN_HALF_HEIGHT, COIN_RADIUS).setDensity(2.7).setFriction(0.42).setRestitution(0.12).setContactSkin(0.002), body);
    this.coins.push({ body, age: 0, previous: new THREE.Vector3(x, y, z), previousVerticalVelocity: 0 });
    if (dropped) this.plinko.enter(body, collider);
    return true;
  }

  setAutoDrop(enabled: boolean) { this.autoDrop = enabled && this.state.phase === 'playing'; this.autoTimer = 0.9; }
  setPaused(paused: boolean) { this.paused = paused; this.lastTime = 0; this.accumulator = 0; }
  cycleCamera() { this.cameraMode = (this.cameraMode + 1) % 3; }

  dropCoin() {
    if (!this.ready || this.paused || this.state.phase !== 'playing' || this.state.tilt > 0 || this.state.balance < 1 || this.dropCooldown > 0) return false;
    if (!this.addCoin(this.aim, 5.47, PLINKO_Z, true)) {
      this.callbacks.onMessage('A full house!', 'Let the pusher clear a little space.'); return false;
    }
    this.run.spendCoin();
    if (this.state.balance === 0) this.autoDrop = false;
    this.recentDrops.push({ time: this.time, x: this.aim });
    if (this.recentDrops.length > 30) this.recentDrops.shift();
    this.dropCooldown = DROP_INTERVAL;
    this.state.dropReadyIn = DROP_INTERVAL;
    this.audio.drop();
    this.emit();
    return true;
  }

  nudge() {
    if (!this.ready || this.paused || this.state.phase !== 'playing' || this.state.tilt > 0) return;
    this.nudgeTimes = this.nudgeTimes.filter(t => this.time - t < 7);
    // Debounce a single physical press, while still counting deliberate repeated nudges.
    if (this.nudgeTimes.length && this.time - this.nudgeTimes[this.nudgeTimes.length - 1] < 0.35) return;
    this.nudgeTimes.push(this.time);
    if (this.nudgeTimes.length >= 3) {
      const charge = this.run.penalize(TILT_COST);
      if (this.state.balance === 0) this.autoDrop = false;
      this.state.tilt = 5; this.audio.tilt(); this.shake = 0.13; this.nudgeTimes = []; this.emit();
      this.callbacks.onMessage(`TILT! −${charge} COINS`, 'The attendant noticed. Five seconds to cool off.', 'warning');
      return;
    }
    this.audio.nudge(); this.shake = 0.22;
    this.bumpCoins(1);
    this.callbacks.onMessage(this.nudgeTimes.length === 1 ? 'Who, me?' : 'The attendant is watching…', this.nudgeTimes.length === 1 ? 'One little nudge. Nobody saw a thing.' : `One more nudge costs ${TILT_COST} coins and a 5-second lockout.`, 'warning');
  }

  private bumpCoins(strength: number, lateral = 0) {
    let coinsAffected = 0;
    let impulse = 0;
    for (const coin of this.coins) {
      const p = coin.body.translation();
      if (p.y > 3) continue;
      const mass = coin.body.mass();
      const force = { x: ((Math.random() - 0.5) * 0.7 + lateral) * mass * strength, y: mass * (0.6 + Math.random() * 0.3) * strength, z: mass * 0.55 * strength };
      coin.body.applyImpulse(force, true);
      coin.body.applyTorqueImpulse({ x: mass * 0.025, y: 0, z: mass * (Math.random() - 0.5) * 0.03 }, true);
      coinsAffected++; impulse += Math.hypot(force.x, force.y, force.z);
    }
    return { coinsAffected, impulse };
  }

  private emit() { this.callbacks.onState({ ...this.state }); }

  private award(at: THREE.Vector3) {
    if (!this.ready || this.state.played === 0 || !this.run.collectCoin()) return;
    this.payoutPending++; this.payoutTimer = 0.15;
    this.burst(at, palette.gold, 9);
    this.emit();
  }

  private hitTreasure(at: THREE.Vector3) {
    if (this.state.phase === 'over') return;
    this.bonusHits++;
    this.burst(at, palette.coral, 24);
    this.audio.bonus();
    const jackpot = this.run.collectGem();
    if (jackpot > 0) {
      this.payoutPending += jackpot; this.payoutTimer = 0.15;
      this.callbacks.onMessage('DEEP SEA JACKPOT!', `+${jackpot.toLocaleString()} coins added to your pocket!`, 'bonus');
      for (let i = 0; i < 4; i++) this.burst(new THREE.Vector3((i - 1.5) * 1.7, 4.8, 0), [palette.mint, palette.gold, palette.coral][i % 3], 30);
    } else this.callbacks.onMessage('THE SHARK FREED YOUR TREASURE!', `Gem ${this.state.gems} of 3. Time another catch.`, 'bonus');
    this.emit();
  }

  private burst(at: THREE.Vector3, color: number, amount: number) {
    if (!this.particleMaterials.has(color)) this.particleMaterials.set(color, new THREE.MeshBasicMaterial({ color }));
    const material = this.particleMaterials.get(color)!;
    for (let i = 0; i < amount && this.particles.length < 180; i++) {
      const mesh = new THREE.Mesh(this.particleGeometry, material); mesh.position.copy(at); this.machine.add(mesh);
      const life = 0.6 + Math.random() * 0.65;
      this.particles.push({ mesh, velocity: new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 2), life, maxLife: life });
    }
  }

  private stepPhysics() {
    if (this.state.phase === 'over') return;
    this.time += STEP;
    this.dropCooldown = Math.max(0, this.dropCooldown - STEP);
    const dropReadyIn = Math.ceil(this.dropCooldown * 10) / 10;
    if (dropReadyIn !== this.state.dropReadyIn) { this.state.dropReadyIn = dropReadyIn; this.emit(); }
    this.aim = Math.sin(this.time * 0.9) * 2.75;
    this.chute.position.x = this.aim;
    this.clinkCooldown = Math.max(0, this.clinkCooldown - STEP);
    if (this.state.tilt > 0) { this.state.tilt = Math.max(0, this.state.tilt - STEP); this.emit(); }
    const pusherZ = -1.49 + Math.sin(this.time * 1.35) * 0.56;
    this.pusher.setNextKinematicTranslation({ x: 0, y: 2.24, z: pusherZ });
    this.plinko.beforeStep(this.time);
    this.world.step();
    this.plinko.afterStep(STEP);
    const treasure = this.plinko.getTreasureStatus();
    if (this.state.treasureHeld !== treasure.held) {
      this.state.treasureHeld = treasure.held; this.emit();
    }
    if (this.ready) this.ocean.update(STEP);
    this.pusherMesh.position.z = this.pusher.translation().z;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i]; coin.age += STEP;
      const p = coin.body.translation();
      const verticalVelocity = coin.body.linvel().y;
      if (this.ready && this.clinkCooldown === 0 && coin.previousVerticalVelocity < -1.2 && verticalVelocity - coin.previousVerticalVelocity > 1) {
        this.audio.clink(Math.min(2, Math.abs(coin.previousVerticalVelocity) / 2));
        this.clinkCooldown = 0.08;
      }
      coin.previousVerticalVelocity = verticalVelocity;
      // The front edge is the payout gate. Side gutters are losses, even if a coin rolls forward later.
      if (p.y < 1.7 && (p.z > 2.44 || Math.abs(p.x) > 3.28)) {
        if (p.z > 2.44 && Math.abs(p.x) < 3.3) this.award(new THREE.Vector3(p.x, p.y, p.z));
        else this.lostCoins++;
        this.plinko.forget(coin.body);
        this.world.removeRigidBody(coin.body); this.coins.splice(i, 1);
      } else if (p.y < -0.5 || Math.abs(p.x) > 7 || p.z > 7) {
        this.plinko.forget(coin.body);
        this.lostCoins++;
        this.world.removeRigidBody(coin.body); this.coins.splice(i, 1);
      } else coin.previous.set(p.x, p.y, p.z);
    }
    if (this.autoDrop && this.state.balance > 0 && this.state.tilt <= 0) {
      this.autoTimer += STEP;
      if (this.autoTimer >= 0.9) { this.autoTimer = 0; this.dropCoin(); }
    }
    if (this.ready && this.state.phase === 'settling') {
      const countdown = Math.ceil(this.state.finalPushRemaining);
      this.run.tick(STEP, this.plinko.getTreasureStatus().held);
      if (this.run.state.phase === 'over') {
        this.autoDrop = false; this.state.tilt = 0;
        this.callbacks.onMessage('RUN OVER', `${this.state.score.toLocaleString()} points. Try to beat it next run.`, 'bonus');
        this.emit();
      } else if (Math.ceil(this.state.finalPushRemaining) !== countdown) this.emit();
    }
    if (this.payoutPending > 0) {
      this.payoutTimer -= STEP;
      if (this.payoutTimer <= 0) { this.callbacks.onWin(this.payoutPending); this.audio.win(this.payoutPending); this.payoutPending = 0; }
    }
  }

  private animate = (timestamp: number) => {
    requestAnimationFrame(this.animate);
    if (document.hidden || this.paused) { this.lastTime = 0; return; }
    const delta = this.lastTime ? Math.min((timestamp - this.lastTime) / 1000, 0.05) : STEP;
    this.lastTime = timestamp;
    this.accumulator += delta;
    while (this.accumulator >= STEP) { this.stepPhysics(); this.accumulator -= STEP; }

    for (let i = 0; i < this.coins.length; i++) {
      const coin = this.coins[i];
      this.dummy.position.copy(coin.body.translation()); this.dummy.quaternion.copy(coin.body.rotation()); this.dummy.updateMatrix();
      this.coinMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.coinMesh.count = this.coins.length;
    this.coinMesh.instanceMatrix.needsUpdate = true;
    if (this.coinMesh.instanceColor) this.coinMesh.instanceColor.needsUpdate = true;
    this.bulbs.forEach((bulb, i) => { (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.3 + Math.max(0, Math.sin(this.time * 4 - i * 0.6)) * 2.4; });
    const chuteReady = this.state.tilt <= 0 && this.state.balance > 0 && this.dropCooldown <= 0;
    this.chuteToken.visible = chuteReady;
    const chuteColor = this.state.tilt > 0 ? palette.coral : chuteReady ? palette.mint : palette.gold;
    this.chuteLight.color.setHex(chuteColor);
    this.chuteLight.emissive.setHex(chuteColor);
    this.chuteLight.emissiveIntensity = chuteReady ? 2.1 : 0.35;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]; particle.life -= delta;
      if (particle.life <= 0) { this.machine.remove(particle.mesh); this.particles.splice(i, 1); continue; }
      particle.velocity.y -= delta * 3;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.scale.setScalar(Math.min(1, particle.life / 0.3));
      particle.mesh.rotation.x += delta * 4;
    }
    this.bubbles.forEach((bubble, i) => { bubble.position.y += delta * (0.08 + i % 4 * 0.025); bubble.position.x += Math.sin(this.time * 0.5 + i) * delta * 0.025; if (bubble.position.y > 8.7) bubble.position.y = 0; });
    this.shake = Math.max(0, this.shake - delta * 0.4);
    this.machine.position.x = Math.sin(this.time * 65) * this.shake;
    this.machine.rotation.z = Math.sin(this.time * 48) * this.shake * 0.025;
    const poses = [new THREE.Vector3(6.8, 8.2, 17.7), new THREE.Vector3(0, 8.6, 18.8), new THREE.Vector3(5.9, 12.6, 13.7)];
    this.camera.position.lerp(poses[this.cameraMode], Math.min(1, delta * 3));
    this.camera.lookAt(0, 2.75, 0.1);
    this.renderer.render(this.scene, this.camera);
  };

  getDebugState() {
    const activeCoins = this.coins.filter(c => !c.body.isSleeping()).length;
    return {
      ...this.state, coinCount: this.coins.length, activeCoins, time: this.time, aim: this.aim,
      pusherZ: this.pusher.translation().z, bonusHits: this.bonusHits, lostCoins: this.lostCoins,
      cameraMode: this.cameraMode, autoDrop: this.autoDrop, paused: this.paused,
      recentDrops: this.recentDrops.map(drop => ({ ...drop })),
      plinko: this.plinko.getDebugState(), ocean: this.ocean.getDebugState(), lastSharkImpact: this.lastSharkImpact,
      coins: this.coins.slice(-5).map(c => ({ position: { ...c.body.translation() }, velocity: { ...c.body.linvel() }, sleeping: c.body.isSleeping(), inPlinko: this.plinko.contains(c.body) })),
      renderer: { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles },
    };
  }
}
