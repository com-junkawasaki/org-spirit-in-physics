// WebGPU Physics Simulation for 3D Force Graph

export interface NodeData {
	position: [number, number, number];
	velocity: [number, number, number];
	scale: number;
	fixed: number;
}

export interface LinkData {
	src: number;
	dst: number;
	weight: number;
	mode: number; // 0: default, 1: tension, 2: compression
	L0: number;
	k: number;
}

export interface PhysicsParams {
	springK: number;
	repulsionK: number;
	damping: number;
	restLength: number;
	maxSpeed: number;
	shellRadius: number;
	shellK: number;
	shellRadiusOuter: number;
	shellKOuter: number;
	radialOutK: number;
	minSep: number;
	sepK: number;
	delta: number;
}

export const COMPUTE_SHADER = `
struct Node {
  position: vec3<f32>,
  velocity: vec3<f32>,
  scale: f32,
  fixed: u32,
}

struct Link {
  src: u32,
  dst: u32,
  weight: f32,
  mode: u32,
  L0: f32,
  k: f32,
}

struct PhysicsParams {
  springK: f32,
  repulsionK: f32,
  damping: f32,
  restLength: f32,
  maxSpeed: f32,
  shellRadius: f32,
  shellK: f32,
  shellRadiusOuter: f32,
  shellKOuter: f32,
  radialOutK: f32,
  minSep: f32,
  sepK: f32,
  delta: f32,
}

@group(0) @binding(0) var<storage, read_write> nodes: array<Node>;
@group(0) @binding(1) var<storage, read> links: array<Link>;
@group(0) @binding(2) var<uniform> params: PhysicsParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let i = global_id.x;
  if (i >= arrayLength(&nodes)) { return; }
  
  var node = nodes[i];
  if (node.fixed == 1u) { return; }
  
  var force = vec3<f32>(0.0);
  
  // Repulsion forces
  for (var j = 0u; j < arrayLength(&nodes); j++) {
    if (i == j) { continue; }
    
    let other = nodes[j];
    let dx = node.position - other.position;
    let distSq = dot(dx, dx) + 1e-6;
    let dist = sqrt(distSq);
    
    var repulsionForce = params.repulsionK / distSq;
    
    // Separation force
    if (params.minSep > 0.0 && params.sepK > 0.0 && dist < params.minSep) {
      let s = (params.minSep - dist) / max(1.0, params.minSep);
      repulsionForce += params.sepK * s * s;
    }
    
    force += (repulsionForce / dist) * dx;
  }
  
  // Spring forces
  for (var k = 0u; k < arrayLength(&links); k++) {
    let link = links[k];
    if (link.src != i && link.dst != i) { continue; }
    
    let otherIndex = select(link.dst, link.src, link.src == i);
    let other = nodes[otherIndex];
    
    let dx = other.position - node.position;
    let dist = length(dx) + 1e-6;
    
    let wClamped = clamp(link.weight, 0.0, 1.0);
    let wAmp = wClamped;
    let L0guess = max(10.0, params.restLength * select(
      1.0 - 0.7 * wClamped,
      1.0 + (1.0 - wClamped) * 1.2,
      link.mode == 2u
    ));
    let L0final = select(L0guess, link.L0, link.L0 > 0.0);
    let kFinal = select(params.springK * (0.1 + 0.9 * wAmp), link.k, link.k > 0.0);
    
    var springForce = 0.0;
    let x = dist - L0final;
    
    if (link.mode == 1u) { // tension
      if (x > 0.0) { springForce = kFinal * x; }
    } else if (link.mode == 2u) { // compression
      if (x < 0.0) { springForce = kFinal * x; }
    } else { // default
      springForce = kFinal * x;
    }
    
    let sign = select(-1.0, 1.0, link.src == i);
    force += sign * (springForce / dist) * dx;
  }
  
  // Shell forces
  let rlen = length(node.position) + 1e-6;
  let radialDir = node.position / rlen;
  
  // Radial force towards shell radius
  let fr = (params.shellRadius - rlen) * params.shellK;
  force += fr * radialDir * 0.016;
  
  // Outer shell attraction
  let frOuter = (params.shellRadiusOuter - rlen) * params.shellKOuter;
  force += frOuter * radialDir * 0.016;
  
  // Radial repulsion from center
  if (params.radialOutK > 0.0) {
    let frRadial = params.radialOutK / (1.0 + rlen);
    force += frRadial * radialDir * params.delta;
  }
  
  // Update velocity
  node.velocity += force * params.delta;
  
  // Apply damping
  node.velocity *= params.damping;
  
  // Limit speed
  let speed = length(node.velocity);
  if (speed > params.maxSpeed) {
    node.velocity = normalize(node.velocity) * params.maxSpeed;
  }
  
  // Update position
  node.position += node.velocity * params.delta;
  
  nodes[i] = node;
}
`;

export function createNodeData(
	nodes: Array<{ scale: number; fixed?: boolean; initial?: [number, number, number] }>
): NodeData[] {
	return nodes.map((node, i) => {
		const initial = node.initial || [
			(Math.random() - 0.5) * 200,
			(Math.random() - 0.5) * 200,
			(Math.random() - 0.5) * 200
		];
		return {
			position: initial,
			velocity: [0, 0, 0],
			scale: node.scale || 1.0,
			fixed: node.fixed ? 1 : 0
		};
	});
}

export function createLinkData(links: Array<{ source: number; target: number; weight: number }>): LinkData[] {
	return links.map((link) => ({
		src: link.source,
		dst: link.target,
		weight: link.weight || 0.5,
		mode: 0,
		L0: 0,
		k: 0
	}));
}
