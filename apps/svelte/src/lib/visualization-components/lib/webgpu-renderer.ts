// WebGPU Renderer for 3D Force Graph

export interface RenderParams {
	width: number;
	height: number;
	camera: {
		position: [number, number, number];
		target: [number, number, number];
		fov: number;
	};
	light: {
		direction: [number, number, number];
		color: [number, number, number];
	};
}

export const VERTEX_SHADER = `
struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) color: vec3<f32>,
  @location(2) normal: vec3<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) worldPos: vec3<f32>,
}

struct Camera {
  view: mat4x4<f32>,
  proj: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> camera: Camera;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  let worldPos = input.position;
  output.worldPos = worldPos;
  output.position = camera.proj * camera.view * vec4<f32>(worldPos, 1.0);
  output.color = input.color;
  output.normal = input.normal;
  return output;
}
`;

export const FRAGMENT_SHADER = `
struct FragmentInput {
  @location(0) color: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) worldPos: vec3<f32>,
}

struct Light {
  direction: vec3<f32>,
  color: vec3<f32>,
}

@group(0) @binding(1) var<uniform> light: Light;

@fragment
fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
  let normal = normalize(input.normal);
  let lightDir = normalize(-light.direction);
  let diff = max(dot(normal, lightDir), 0.0);
  let ambient = 0.3;
  let finalColor = (ambient + diff) * input.color * light.color;
  return vec4<f32>(finalColor, 1.0);
}
`;

export function createCameraMatrix(
	position: [number, number, number],
	target: [number, number, number],
	fov: number,
	aspect: number,
	near: number = 0.1,
	far: number = 1000.0
): { view: Float32Array; proj: Float32Array } {
	// View matrix (lookAt)
	const forward = [
		target[0] - position[0],
		target[1] - position[1],
		target[2] - position[2]
	];
	const len = Math.sqrt(forward[0] ** 2 + forward[1] ** 2 + forward[2] ** 2);
	const f = [forward[0] / len, forward[1] / len, forward[2] / len];

	const up = [0, 1, 0];
	const right = [
		f[1] * up[2] - f[2] * up[1],
		f[2] * up[0] - f[0] * up[2],
		f[0] * up[1] - f[1] * up[0]
	];
	const rlen = Math.sqrt(right[0] ** 2 + right[1] ** 2 + right[2] ** 2);
	const r = [right[0] / rlen, right[1] / rlen, right[2] / rlen];

	const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];

	const view = new Float32Array([
		r[0],
		u[0],
		-f[0],
		0,
		r[1],
		u[1],
		-f[1],
		0,
		r[2],
		u[2],
		-f[2],
		0,
		-(r[0] * position[0] + r[1] * position[1] + r[2] * position[2]),
		-(u[0] * position[0] + u[1] * position[1] + u[2] * position[2]),
		f[0] * position[0] + f[1] * position[1] + f[2] * position[2],
		1
	]);

	// Projection matrix
	const fovRad = (fov * Math.PI) / 180;
	const focalLength = 1.0 / Math.tan(fovRad / 2);
	const proj = new Float32Array([
		focalLength / aspect,
		0,
		0,
		0,
		0,
		focalLength,
		0,
		0,
		0,
		0,
		(far + near) / (near - far),
		-1,
		0,
		0,
		(2 * far * near) / (near - far),
		0
	]);

	return { view, proj };
}
