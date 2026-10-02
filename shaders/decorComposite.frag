uniform sampler2D uTexture;
uniform float uVisibility;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(uTexture, vUv) * uVisibility;
}
