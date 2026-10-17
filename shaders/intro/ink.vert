#version 300 es
// The intro's ink: one full-screen triangle; uv covers the screen 0..1 (y up).
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
