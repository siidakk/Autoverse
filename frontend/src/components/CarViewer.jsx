import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import CarModel from "./CarModel";

export default function CarViewer({ car, color, paint }) {
  return (
    <Canvas camera={{ position: [3, 2, 5] }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} />

      <CarModel car={car} color={color} paint={paint} />

      <OrbitControls enablePan={false} />
    </Canvas>
  );
}