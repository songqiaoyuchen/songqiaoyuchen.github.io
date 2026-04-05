export function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      {/* Subtle fill light from the opposite side */}
      <directionalLight position={[-10, -5, -5]} intensity={0.5} color="#4488ff" />
    </>
  );
}
