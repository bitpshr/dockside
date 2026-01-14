"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ShaderMaterial, BackSide, Vector3, Mesh } from "three";

const SKY_VERTEX = `
  varying vec3 vWorldPosition;

  void main() {
    vWorldPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = `
  uniform vec3 uSunPosition;
  uniform float uTime;

  varying vec3 vWorldPosition;

  // Hash-based 2D noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal Brownian Motion for cloud shapes — 8 octaves for detail
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 8; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float elevation = max(dir.y, 0.0);

    // Sky gradient: deep blue zenith -> lighter blue horizon
    vec3 zenith = vec3(0.10, 0.30, 0.70);
    vec3 horizon = vec3(0.50, 0.68, 0.88);
    vec3 sky = mix(horizon, zenith, pow(elevation, 0.4));

    // Warm horizon band (atmospheric scattering)
    sky = mix(sky, vec3(0.75, 0.82, 0.90), exp(-elevation * 10.0) * 0.3);

    // Sun disc + glow + halo
    vec3 sunDir = normalize(uSunPosition);
    float cosAngle = dot(dir, sunDir);
    sky += vec3(1.0, 0.97, 0.90) * smoothstep(0.9995, 0.9999, cosAngle);
    sky += vec3(1.0, 0.90, 0.65) * pow(max(cosAngle, 0.0), 64.0) * 0.4;
    sky += vec3(1.0, 0.95, 0.85) * pow(max(cosAngle, 0.0), 8.0) * 0.08;

    // Procedural clouds — two layers for depth
    if (elevation > 0.02) {
      vec2 uv = dir.xz / (dir.y + 0.1) * 3.0;

      // Layer 1: main cumulus-like clouds
      vec2 uv1 = uv * 0.6 + uTime * vec2(0.012, 0.006);
      float n1 = fbm(uv1);
      float density1 = smoothstep(0.38, 0.68, n1);

      // Layer 2: high wispy clouds (cirrus-like)
      vec2 uv2 = uv * 1.8 + uTime * vec2(0.02, 0.01);
      float n2 = fbm(uv2);
      float density2 = smoothstep(0.50, 0.75, n2) * 0.35;

      float density = max(density1, density2);

      // Cloud lighting: brighter facing the sun, slight gray in shadow
      float sunLight = pow(max(dot(dir, sunDir), 0.0), 4.0);
      vec3 cloudBright = vec3(1.0, 0.98, 0.95);
      vec3 cloudShadow = vec3(0.78, 0.80, 0.85);
      vec3 cloudCol = mix(cloudShadow, cloudBright, sunLight * 0.4 + n1 * 0.4);

      // Fade clouds near horizon (atmospheric haze)
      density *= smoothstep(0.02, 0.2, elevation);

      sky = mix(sky, cloudCol, density * 0.85);
    }

    // Below horizon: blend to fog/haze color
    if (dir.y < 0.0) {
      vec3 fogCol = vec3(0.69, 0.816, 0.91);
      sky = mix(fogCol, sky, smoothstep(-0.05, 0.0, dir.y));
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export function SkyDome() {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const { camera } = useThree();

  const uniforms = useMemo(() => ({
    uSunPosition: { value: new Vector3(100, 150, -50) },
    uTime: { value: 0 },
  }), []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <sphereGeometry args={[400, 128, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={SKY_VERTEX}
        fragmentShader={SKY_FRAGMENT}
        uniforms={uniforms}
        side={BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}
