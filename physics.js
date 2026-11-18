// Ändra standardvärdet här om du vill använda en annan tyngdacceleration.
window.PHYSICS_SETTINGS = {
  defaultGravity: 9.82
};

window.ProjectilePhysics = {
  calculate(speed, angleDegrees, gravity, launchHeight) {
    const angle = angleDegrees * Math.PI / 180;
    const horizontalSpeed = speed * Math.cos(angle);
    const verticalSpeed = speed * Math.sin(angle);
    const verticalSpeedAtLanding = Math.sqrt(verticalSpeed * verticalSpeed + 2 * gravity * launchHeight);
    const flightTime = verticalSpeed >= 0
      ? (verticalSpeed + verticalSpeedAtLanding) / gravity
      : 2 * launchHeight / (verticalSpeedAtLanding - verticalSpeed);
    const range = horizontalSpeed * flightTime;
    const upwardSpeed = Math.max(0, verticalSpeed);
    const maxHeight = launchHeight + upwardSpeed * upwardSpeed / (2 * gravity);

    return {
      horizontalSpeed,
      verticalSpeed,
      flightTime,
      range,
      maxHeight,
      positionAt(time) {
        return {
          x: horizontalSpeed * time,
          y: launchHeight + verticalSpeed * time - 0.5 * gravity * time * time
        };
      },
      velocityAt(time) {
        return {
          x: horizontalSpeed,
          y: verticalSpeed - gravity * time
        };
      }
    };
  }
};
