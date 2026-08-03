function Spoiler({ type }) {

  if (type === "sport") {

    return (
      <mesh position={[0, 0.5, 3]}>
        <boxGeometry args={[2, 0.1, 0.4]} />
        <meshStandardMaterial color="black" />
      </mesh>
    )
  }

  if (type === "racing") {

    return (
      <>
        <mesh position={[0, 0.7, 3]}>
          <boxGeometry args={[2.5, 0.15, 0.5]} />
          <meshStandardMaterial color="red" />
        </mesh>

        <mesh position={[-0.8, 0.3, 3]}>
          <boxGeometry args={[0.1, 0.7, 0.1]} />
          <meshStandardMaterial color="white" />
        </mesh>

        <mesh position={[0.8, 0.3, 3]}>
          <boxGeometry args={[0.1, 0.7, 0.1]} />
          <meshStandardMaterial color="white" />
        </mesh>
      </>
    )
  }

  return null
}

export default Spoiler