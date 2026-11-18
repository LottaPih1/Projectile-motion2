(function () {
  const content = window.LESSON_CONTENT;
  const physics = window.ProjectilePhysics;
  const settings = window.PHYSICS_SETTINGS;
  const svgNamespace = "http://www.w3.org/2000/svg";
  const chart = document.getElementById("trajectory");
  const speedInput = document.getElementById("speed");
  const angleInput = document.getElementById("angle");
  const gravityInput = document.getElementById("gravity");
  const launchHeightInput = document.getElementById("launch-height");
  const celestialBodySelect = document.getElementById("celestial-body");
  const xAxisMaxInput = document.getElementById("x-axis-max");
  const yAxisMinInput = document.getElementById("y-axis-min");
  const yAxisMaxInput = document.getElementById("y-axis-max");
  const angleValue = document.getElementById("angle-value");
  const errorMessage = document.getElementById("error-message");
  const playButton = document.getElementById("play-button");
  const resetButton = document.getElementById("reset-button");
  const velocityReadout = document.getElementById("velocity-readout");
  const scaleWarning = document.getElementById("scale-warning");
  const velocityVectorSeconds = 0.1;
  const defaultValues = {
    speed: 20,
    angle: 45,
    launchHeight: 0,
    gravity: settings.defaultGravity,
    xAxisMax: 100,
    yAxisMin: -20,
    yAxisMax: 30
  };
  let chartDescription = document.getElementById("chart-description");
  let animationFrame = null;
  let currentModel = null;
  let currentScale = null;
  let currentParameters = null;
  let committedKey = null;
  let committedTrajectory = null;
  let previousTrajectories = [];

  document.getElementById("intro").textContent = content.intro;
  document.getElementById("lesson-intro").textContent = content.lessonIntro;
  document.getElementById("horizontal-equation").textContent = content.horizontalEquation;
  document.getElementById("vertical-equation").textContent = content.verticalEquation;
  document.getElementById("time-equation").textContent = content.timeEquation;
  document.getElementById("range-equation").textContent = content.rangeEquation;
  document.getElementById("lesson-note").textContent = content.lessonNote;
  document.getElementById("gravity-hint").textContent = "Välj en himlakropp eller ange ett eget värde.";
  gravityInput.value = defaultValues.gravity;
  celestialBodySelect.value = String(settings.defaultGravity);
  if (celestialBodySelect.value !== String(settings.defaultGravity)) {
    celestialBodySelect.value = "custom";
  }

  function svgElement(tag, attributes, text) {
    const element = document.createElementNS(svgNamespace, tag);
    Object.keys(attributes).forEach(function (name) {
      element.setAttribute(name, attributes[name]);
    });
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  function formatNumber(value) {
    return value.toLocaleString("sv-SE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatSignedNumber(value) {
    return (value > 0 ? "+" : "") + formatNumber(value);
  }

  function clearChart() {
    while (chart.firstChild) {
      chart.removeChild(chart.firstChild);
    }
    chart.appendChild(svgElement("title", { id: "chart-title" }, "Graf över bollens kastbana"));
    chartDescription = svgElement("desc", { id: "chart-description" }, "");
    chart.appendChild(chartDescription);
  }

  function getParameterKey(parameters) {
    return [
      parameters.speed,
      parameters.angle,
      parameters.gravity,
      parameters.launchHeight
    ].join("|");
  }

  function drawTrajectory(model, x, y, className, title) {
    const pathPoints = [];
    for (let index = 0; index <= 100; index += 1) {
      const position = model.positionAt(model.flightTime * index / 100);
      pathPoints.push((index === 0 ? "M" : "L") + x(position.x) + " " + y(position.y));
    }

    const path = svgElement("path", {
      class: className,
      d: pathPoints.join(" ")
    });
    path.appendChild(svgElement("title", {}, title));
    chart.appendChild(path);
  }

  function trajectoryTitle(parameters) {
    return "Begynnelsehastighet " + formatNumber(parameters.speed) +
      " m/s, vinkel " + formatNumber(parameters.angle) + " grader, g " +
      formatNumber(parameters.gravity) + " m/s², starthöjd " +
      formatNumber(parameters.launchHeight) + " m";
  }

  function trajectoryFits(model, xMax, yMin, yMax) {
    for (let index = 0; index <= 100; index += 1) {
      const time = model.flightTime * index / 100;
      const position = model.positionAt(time);
      const velocity = model.velocityAt(time);
      const vectorEndX = position.x + velocity.x * velocityVectorSeconds;
      const vectorEndY = position.y + velocity.y * velocityVectorSeconds;
      if (position.x < -1e-8 || position.x > xMax + 1e-8 ||
          position.y < yMin - 1e-8 || position.y > yMax + 1e-8 ||
          vectorEndX < -1e-8 || vectorEndX > xMax + 1e-8 ||
          vectorEndY < yMin - 1e-8 || vectorEndY > yMax + 1e-8) {
        return false;
      }
    }
    return true;
  }

  function drawChart() {
    clearChart();

    const width = 800;
    const margin = { top: 34, right: 28, bottom: 62, left: 76 };
    const plotWidth = width - margin.left - margin.right;
    const minX = 0;
    const maxX = Number(xAxisMaxInput.value);
    const minY = Number(yAxisMinInput.value);
    const maxY = Number(yAxisMaxInput.value);
    if (!Number.isFinite(maxX) || maxX <= minX ||
        !Number.isFinite(minY) || !Number.isFinite(maxY) ||
        minY > 0 || maxY <= 0 || maxY <= minY) {
      currentScale = null;
      chart.setAttribute("viewBox", "0 0 800 440");
      scaleWarning.textContent = "Axelgränserna måste innehålla marknivån (0 m) och ha ett positivt horisontellt max.";
      scaleWarning.hidden = false;
      chartDescription.textContent = "Ange giltiga axelgränser för att visa diagrammet.";
      return;
    }

    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const maxPlotHeight = 344;
    const scale = Math.min(plotWidth / xRange, maxPlotHeight / yRange);
    const plotHeight = yRange * scale;
    const height = margin.top + plotHeight + margin.bottom;
    const plotRight = margin.left + xRange * scale;
    const tickTarget = Math.max(xRange, yRange) / 10;
    const tickPower = Math.pow(10, Math.floor(Math.log10(tickTarget)));
    const tickMagnitude = tickTarget / tickPower;
    const tickStep = (tickMagnitude < 2 ? 1 : tickMagnitude < 5 ? 2 : 5) * tickPower;
    const x = function (value) {
      return margin.left + (value - minX) * scale;
    };
    const y = function (value) {
      return margin.top + (maxY - value) * scale;
    };
    const grid = svgElement("g", { class: "grid" });
    chart.setAttribute("viewBox", "0 0 " + width + " " + height);
    scaleWarning.hidden = true;

    for (let value = Math.ceil(minX / tickStep) * tickStep; value <= maxX; value += tickStep) {
      const verticalX = x(value);
      grid.appendChild(svgElement("line", {
        x1: verticalX, y1: y(maxY), x2: verticalX, y2: y(minY)
      }));
      grid.appendChild(svgElement("text", {
        x: verticalX, y: y(0) + 22, "text-anchor": "middle"
      }, formatNumber(value === 0 ? 0 : value)));
    }

    for (let value = Math.ceil(minY / tickStep) * tickStep; value <= maxY; value += tickStep) {
      const horizontalY = y(value);
      grid.appendChild(svgElement("line", {
        x1: margin.left, y1: horizontalY, x2: plotRight, y2: horizontalY
      }));
      grid.appendChild(svgElement("text", {
        x: margin.left - 12, y: horizontalY + 4, "text-anchor": "end"
      }, formatNumber(value === 0 ? 0 : value)));
    }
    chart.appendChild(grid);

    chart.appendChild(svgElement("line", {
      class: "axis", x1: x(minX), y1: y(0),
      x2: plotRight, y2: y(0)
    }));
    chart.appendChild(svgElement("line", {
      class: "axis", x1: x(0), y1: y(maxY),
      x2: x(0), y2: y(minY)
    }));
    chart.appendChild(svgElement("text", {
      class: "axis-label", x: (x(minX) + plotRight) / 2, y: height - 12, "text-anchor": "middle"
    }, "Horisontell sträcka (m)"));
    chart.appendChild(svgElement("text", {
      class: "axis-label", x: 19, y: margin.top + plotHeight / 2,
      "text-anchor": "middle", transform: "rotate(-90 19 " + (margin.top + plotHeight / 2) + ")"
    }, "Höjd (m)"));

    const activeKey = currentParameters ? getParameterKey(currentParameters) : null;
    const displayedPrevious = previousTrajectories.slice();
    if (committedTrajectory && committedTrajectory.key !== activeKey) {
      displayedPrevious.push(committedTrajectory);
    }
    displayedPrevious.forEach(function (trajectory) {
      drawTrajectory(
        trajectory.model,
        x,
        y,
        "trajectory-line previous-trajectory",
        trajectoryTitle(trajectory.parameters)
      );
    });

    if (currentModel) {
      drawTrajectory(
        currentModel,
        x,
        y,
        "trajectory-line",
        "Nuvarande bana: " + trajectoryTitle(currentParameters)
      );
    }

    const definitions = svgElement("defs", {});
    const arrow = svgElement("marker", {
      id: "velocity-arrow",
      viewBox: "0 0 10 10",
      refX: "9",
      refY: "5",
      markerWidth: "7",
      markerHeight: "7",
      markerUnits: "userSpaceOnUse",
      orient: "auto"
    });
    arrow.appendChild(svgElement("path", {
      d: "M 0 0 L 10 5 L 0 10 z",
      class: "velocity-arrowhead"
    }));
    definitions.appendChild(arrow);
    chart.appendChild(definitions);

    currentScale = null;
    if (currentModel) {
      const vector = svgElement("line", {
        class: "velocity-vector",
        "marker-end": "url(#velocity-arrow)"
      });
      chart.appendChild(vector);

      const marker = svgElement("circle", {
        class: "ball-marker", cx: x(0), cy: y(Number(launchHeightInput.value)), r: 9
      });
      chart.appendChild(marker);

      const vectorLabel = svgElement("text", { class: "vector-label" }, "v");
      chart.appendChild(vectorLabel);

      currentScale = {
        x: x,
        y: y,
        marker: marker,
        vector: vector,
        vectorLabel: vectorLabel
      };
      updateBallAndVector(currentModel, 0);
    }

    const modelsToCheck = displayedPrevious.map(function (trajectory) {
      return trajectory.model;
    });
    if (currentModel) {
      modelsToCheck.push(currentModel);
    }
    scaleWarning.hidden = !modelsToCheck.some(function (model) {
      return !trajectoryFits(model, maxX, minY, maxY);
    });
    if (!scaleWarning.hidden) {
      scaleWarning.textContent = "En eller flera banor hamnar utanför skalan. Öka axelgränserna för att visa hela banorna.";
    }

    chartDescription.textContent = currentModel
      ? "Kastbana från " + formatNumber(currentParameters.launchHeight) +
        " meters höjd, flygtid " + formatNumber(currentModel.flightTime) +
        " sekunder. Tidigare banor visas streckade."
      : "Tidigare banor visas streckade.";
  }

  function updateBallAndVector(model, time) {
    const position = model.positionAt(time);
    const velocity = model.velocityAt(time);
    const speedMagnitude = Math.hypot(velocity.x, velocity.y);
    const ballX = currentScale.x(position.x);
    const ballY = currentScale.y(Math.max(0, position.y));
    const vectorEndX = currentScale.x(position.x + velocity.x * velocityVectorSeconds);
    const vectorEndY = currentScale.y(position.y + velocity.y * velocityVectorSeconds);

    currentScale.marker.setAttribute("cx", ballX);
    currentScale.marker.setAttribute("cy", ballY);
    currentScale.vector.setAttribute("x1", ballX);
    currentScale.vector.setAttribute("y1", ballY);
    currentScale.vector.setAttribute("x2", vectorEndX);
    currentScale.vector.setAttribute("y2", vectorEndY);
    currentScale.vectorLabel.setAttribute("x", (ballX + vectorEndX) / 2 + 7);
    currentScale.vectorLabel.setAttribute("y", (ballY + vectorEndY) / 2 - 7);
    velocityReadout.textContent = "vₓ = " + formatNumber(velocity.x) + " m/s · vᵧ = " +
      formatSignedNumber(velocity.y) + " m/s · |v| = " + formatNumber(speedMagnitude) + " m/s";
  }

  function update() {
    const speed = Number(speedInput.value);
    const angle = Number(angleInput.value);
    const gravity = Number(gravityInput.value);
    const launchHeight = Number(launchHeightInput.value);
    angleValue.value = angle + "°";
    angleValue.textContent = angle + "°";
    currentParameters = {
      speed: speed,
      angle: angle,
      gravity: gravity,
      launchHeight: launchHeight
    };

    let validationMessage = "";
    if (!Number.isFinite(speed) || speed <= 0 ||
        !Number.isFinite(angle) || angle < -90 || angle > 90 ||
        !Number.isFinite(gravity) || gravity <= 0 ||
        !Number.isFinite(launchHeight) || launchHeight < 0) {
      validationMessage = "Ange giltig hastighet, kastvinkel, starthöjd och tyngdacceleration.";
    } else if (angle <= 0 && launchHeight <= 0) {
      validationMessage = "Negativa och vågräta kast kräver en starthöjd över marken för att få en flygtid.";
    }

    const axisMax = Number(xAxisMaxInput.value);
    const axisMinHeight = Number(yAxisMinInput.value);
    const axisMaxHeight = Number(yAxisMaxInput.value);
    if (!validationMessage &&
        (!Number.isFinite(axisMax) || axisMax <= 0 ||
         !Number.isFinite(axisMinHeight) || !Number.isFinite(axisMaxHeight) ||
         axisMinHeight > 0 || axisMaxHeight <= 0 || axisMaxHeight <= axisMinHeight)) {
      validationMessage = "Axelgränserna måste innehålla marknivån (0 m) och ha ett positivt horisontellt max.";
    }

    if (validationMessage) {
      errorMessage.textContent = validationMessage;
      errorMessage.hidden = false;
      playButton.disabled = true;
      document.getElementById("flight-time").textContent = "–";
      document.getElementById("range").textContent = "–";
      document.getElementById("max-height").textContent = "–";
      stopAnimation();
      currentModel = null;
      currentScale = null;
      velocityReadout.textContent = "";
      drawChart();
      return;
    }

    errorMessage.hidden = true;
    playButton.disabled = false;
    stopAnimation();
    currentModel = physics.calculate(speed, angle, gravity, launchHeight);

    document.getElementById("flight-time").textContent = formatNumber(currentModel.flightTime);
    document.getElementById("range").textContent = formatNumber(currentModel.range);
    document.getElementById("max-height").textContent = formatNumber(currentModel.maxHeight);
    drawChart();
  }

  function commitCurrentTrajectory() {
    if (!currentParameters) {
      return;
    }

    const key = getParameterKey(currentParameters);
    if (key === committedKey) {
      return;
    }
    if (committedTrajectory) {
      previousTrajectories.push(committedTrajectory);
    }
    committedTrajectory = currentModel ? {
      key: key,
      parameters: Object.assign({}, currentParameters),
      model: currentModel
    } : null;
    committedKey = key;
    drawChart();
  }

  function stopAnimation() {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    playButton.textContent = "Spela upp rörelsen";
  }

  function play() {
    if (!currentModel || !currentScale || animationFrame !== null) {
      return;
    }

    const start = performance.now();
    const duration = Math.max(1400, currentModel.flightTime * 700);
    playButton.textContent = "Spelar upp …";

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      updateBallAndVector(currentModel, progress * currentModel.flightTime);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(frame);
      } else {
        animationFrame = null;
        playButton.textContent = "Spela igen";
      }
    }

    animationFrame = requestAnimationFrame(frame);
  }

  function reset() {
    stopAnimation();
    speedInput.value = defaultValues.speed;
    angleInput.value = defaultValues.angle;
    launchHeightInput.value = defaultValues.launchHeight;
    gravityInput.value = defaultValues.gravity;
    celestialBodySelect.value = String(defaultValues.gravity);
    if (celestialBodySelect.value !== String(defaultValues.gravity)) {
      celestialBodySelect.value = "custom";
    }
    xAxisMaxInput.value = defaultValues.xAxisMax;
    yAxisMinInput.value = defaultValues.yAxisMin;
    yAxisMaxInput.value = defaultValues.yAxisMax;
    previousTrajectories = [];
    committedTrajectory = null;
    committedKey = null;
    update();
    commitCurrentTrajectory();
  }

  [speedInput, angleInput, launchHeightInput].forEach(function (input) {
    input.addEventListener("input", update);
    input.addEventListener("change", function () {
      update();
      commitCurrentTrajectory();
    });
  });

  gravityInput.addEventListener("input", function () {
    celestialBodySelect.value = "custom";
    update();
  });
  gravityInput.addEventListener("change", function () {
    update();
    commitCurrentTrajectory();
  });
  celestialBodySelect.addEventListener("change", function () {
    if (celestialBodySelect.value !== "custom") {
      gravityInput.value = celestialBodySelect.value;
    }
    update();
    commitCurrentTrajectory();
  });
  [xAxisMaxInput, yAxisMinInput, yAxisMaxInput].forEach(function (input) {
    input.addEventListener("input", update);
    input.addEventListener("change", function () {
      update();
      commitCurrentTrajectory();
    });
  });
  playButton.addEventListener("click", play);
  resetButton.addEventListener("click", reset);
  update();
  commitCurrentTrajectory();
}());
