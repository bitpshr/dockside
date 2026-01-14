"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color, DoubleSide, Vector3 } from "three";

const WATER_VERTEX_SHADER = `
  uniform float uTime;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec3 pos = position;
    vec2 p = pos.xy;

    // Wave height and analytical derivatives for proper normals
    float h = 0.0;
    float dhdx = 0.0;
    float dhdy = 0.0;

    // Wave 1: gentle swell (calm marina)
    float d1 = dot(p, vec2(1.0, 0.3)) * 0.3 + uTime * 0.6;
    h += sin(d1) * 0.06;
    float c1 = cos(d1) * 0.06 * 0.3;
    dhdx += c1 * 1.0;
    dhdy += c1 * 0.3;

    // Wave 2: cross swell
    float d2 = dot(p, vec2(-0.3, 1.0)) * 0.5 + uTime * 0.8;
    h += sin(d2) * 0.04;
    float c2 = cos(d2) * 0.04 * 0.5;
    dhdx += c2 * (-0.3);
    dhdy += c2 * 1.0;

    // Wave 3: chop
    float d3 = dot(p, vec2(0.7, -0.7)) * 0.8 + uTime * 1.2;
    h += sin(d3) * 0.025;
    float c3 = cos(d3) * 0.025 * 0.8;
    dhdx += c3 * 0.7;
    dhdy += c3 * (-0.7);

    // Wave 4: secondary chop
    float d4 = dot(p, vec2(-0.8, 0.6)) * 1.3 + uTime * 1.0;
    h += sin(d4) * 0.015;
    float c4 = cos(d4) * 0.015 * 1.3;
    dhdx += c4 * (-0.8);
    dhdy += c4 * 0.6;

    // Wave 5: fine ripple
    float d5 = dot(p, vec2(0.5, 0.5)) * 2.0 + uTime * 1.5;
    h += sin(d5) * 0.01;
    float c5 = cos(d5) * 0.01 * 2.0;
    dhdx += c5 * 0.5;
    dhdy += c5 * 0.5;

    // Wave 6: micro ripple (wind chop)
    float d6 = dot(p, vec2(-0.6, 0.8)) * 3.5 + uTime * 2.2;
    h += sin(d6) * 0.006;
    float c6 = cos(d6) * 0.006 * 3.5;
    dhdx += c6 * (-0.6);
    dhdy += c6 * 0.8;

    // Wave 7: ultra-fine surface texture
    float d7 = dot(p, vec2(0.9, 0.4)) * 5.0 + uTime * 2.8;
    h += sin(d7) * 0.003;
    float c7 = cos(d7) * 0.003 * 5.0;
    dhdx += c7 * 0.9;
    dhdy += c7 * 0.4;

    pos.z += h;

    // Surface normal from wave derivatives (local space)
    vec3 localNormal = normalize(vec3(-dhdx, -dhdy, 1.0));
    vWorldNormal = normalize(normalMatrix * localNormal);
    vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const WATER_FRAGMENT_SHADER = `
  uniform vec3 uDeepColor;
  uniform vec3 uSkyColor;
  uniform vec3 uSunDir;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    // Fresnel — water reflects sky at shallow viewing angles
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
    fresnel = clamp(fresnel, 0.03, 0.8);

    // Sun specular — tight highlight for direct sun reflection
    vec3 halfDir = normalize(uSunDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 512.0);

    // Secondary broader specular for sun path on water
    float spec2 = pow(max(dot(normal, halfDir), 0.0), 64.0);

    // Base water color
    vec3 waterColor = uDeepColor;

    // Combine: water + sky reflection via Fresnel + sun specular
    vec3 color = mix(waterColor, uSkyColor, fresnel);
    color += vec3(1.0, 0.95, 0.85) * spec * 1.5;
    color += vec3(1.0, 0.97, 0.9) * spec2 * 0.15;

    gl_FragColor = vec4(color, 0.93);
  }
`;

export function WaterSurface() {
  const materialRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uDeepColor: { value: new Color("#0a5e7a") },
    uSkyColor: { value: new Color("#87CEEB") },
    uSunDir: { value: new Vector3(100, 150, -50).normalize() },
  }), []);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.0, 0]} receiveShadow>
      <planeGeometry args={[400, 400, 512, 512]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={WATER_VERTEX_SHADER}
        fragmentShader={WATER_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        side={DoubleSide}
      />
    </mesh>
  );
}
