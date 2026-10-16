// Places globe line layers: a flat colour at an opacity, toned and encoded like three's line material.
uniform vec3 uColor;
uniform float uOpacity;

varying float vFade;

void main() {
  gl_FragColor = vec4(uColor, uOpacity * vFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
