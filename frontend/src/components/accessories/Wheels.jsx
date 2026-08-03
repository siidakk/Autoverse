function Wheels({ type }) {

const wheelPositions = [
  [-2.15, -0.82, 1.5], // front left
  [2.15, -0.82, 1.5],  // front right

  [-2.05, -0.82, -1.5], // rear left
  [2.05, -0.82, -1.5],  // rear right
]

  // SPORT WHEELS
  if (type === "sport") {

    return (
      <>
        {wheelPositions.map((pos, index) => (

          <mesh
            key={index}
            position={pos}
            rotation={[0, Math.PI / 2, 0]}
          >

            <torusGeometry
              args={[0.45, 0.12, 16, 100]}
            />

            <meshStandardMaterial color="silver" />

          </mesh>

        ))}
      </>
    )
  }

  // CLASSIC WHEELS
  if (type === "classic") {

    return (
      <>
        {wheelPositions.map((pos, index) => (

          <mesh
            key={index}
            position={pos}
            rotation={[0, 0, Math.PI / 2]}
          >

            <cylinderGeometry
              args={[0.45, 0.45, 0.25, 32]}
            />

            <meshStandardMaterial color="black" />

          </mesh>

        ))}
      </>
    )
  }

  return null
}

export default Wheels