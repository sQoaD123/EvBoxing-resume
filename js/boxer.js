document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const boxerId = urlParams.get("id");

  if (!boxerId) {
    document.getElementById("boxer-name").textContent = "Boxer Not Found";
    return;
  }

  const tierPoints = {
    D: 0,
    C: 1,
    B: 3,
    "B+": 5,
    A: 7,
    "A+": 9,
    "A++": 12,
    S: 20,
    "S+": 40,
  };
  const tierOrder = {
    D: 1,
    C: 2,
    B: 3,
    "B+": 4,
    A: 5,
    "A+": 6,
    "A++": 7,
    S: 8,
    "S+": 9,
  };
  const tierLabels = ["D", "C", "B", "B+", "A", "A+", "A++", "S", "S+"];

  // Еталонний порядок для сортування легенди кругових діаграм
  const sortedTierOrder = [
    "D",
    "C",
    "B",
    "B+",
    "A",
    "A+",
    "A++",
    "S",
    "S+",
    "X",
  ];

  const tierColorsMap = {
    D: "#444444",
    C: "#666666",
    B: "#34495e",
    "B+": "#2980b9",
    A: "#27ae60",
    "A+": "#16a085",
    "A++": "#d35400",
    S: "#c0392b",
    "S+": "#8e44ad",
    X: "#222222",
  };

  const getTierIndex = (tier) => {
    const index = tierLabels.indexOf(tier.toUpperCase());
    return index !== -1 ? index : 0;
  };

  fetch(`data/boxers/${boxerId}.json`)
    .then((response) => {
      if (!response.ok) throw new Error("File not found");
      return response.json();
    })
    .then((data) => {
      document.getElementById("boxer-name").textContent = data.name;
      document.getElementById("boxer-country").textContent = data.countryCode;
      document.title = `${data.name} - Boxing Stats`;

      let wins = 0,
        losses = 0,
        draws = 0,
        ncs = 0,
        koWins = 0,
        koLosses = 0;
      let totalPoints = 0,
        highestTierWeight = 0,
        bestWins = [];

      const chartLabels = [];
      const chartDataTiers = [];
      const chartDataPoints = [];
      const pointColors = [];
      const hoverOpponents = [];
      const hoverResults = [];
      const hoverTiers = [];

      const winTiersCount = {};
      const lossTiersCount = {};

      if (data.fights && data.fights.length > 0) {
        data.fights.forEach((fight) => {
          const res = fight.result.toUpperCase();
          const currentTier = fight.tier ? fight.tier.toUpperCase() : "D";
          const currentPoints = tierPoints[currentTier] || 0;

          let fightColor = "#555555";

          if (res.startsWith("W-")) {
            wins++;
            fightColor = "#008000";
            if (
              res.includes("KO") ||
              res.includes("TKO") ||
              res.includes("RTD")
            )
              koWins++;
            totalPoints += currentPoints;

            const currentWeight = tierOrder[currentTier] || 0;
            if (currentWeight > highestTierWeight) {
              highestTierWeight = currentWeight;
              bestWins = [fight];
            } else if (
              currentWeight === highestTierWeight &&
              currentWeight > 0
            ) {
              bestWins.push(fight);
            }

            winTiersCount[currentTier] = (winTiersCount[currentTier] || 0) + 1;
          } else if (res.startsWith("L-")) {
            losses++;
            fightColor = "#cc0000";
            if (
              res.includes("KO") ||
              res.includes("TKO") ||
              res.includes("RTD")
            )
              koLosses++;

            lossTiersCount[currentTier] =
              (lossTiersCount[currentTier] || 0) + 1;
          } else if (res.startsWith("D") || res === "DRAW") {
            draws++;
            fightColor = "#66b2ff";
          } else if (res.startsWith("NC") || res.includes("NO CONTEST")) {
            ncs++;
            fightColor = "#555555";
          }

          chartLabels.push(fight.num);
          chartDataTiers.push(getTierIndex(currentTier));
          chartDataPoints.push(res.startsWith("W-") ? currentPoints : 0);
          pointColors.push(fightColor);
          hoverOpponents.push(fight.opponent);
          hoverResults.push(fight.result);
          hoverTiers.push(currentTier);
        });
      }

      // Заповнення віджету рекорду та таблиці 2х3
      document.getElementById("record-wins").textContent = wins;
      document.getElementById("record-losses").textContent = losses;
      document.getElementById("record-draws").textContent = draws;
      document.getElementById("record-kos").textContent = koWins;
      document.getElementById("record-loss-kos").textContent = koLosses;

      const recordRow = document.querySelector(".record-row");
      const ncBlock = document.getElementById("nc-block");
      const ncSubtext = document.getElementById("nc-subtext");

      if (ncs > 0) {
        document.getElementById("record-nc").textContent = ncs;
        ncBlock.style.display = "block";
        ncSubtext.style.display = "block";
        recordRow.classList.add("has-nc");
      } else {
        ncBlock.style.display = "none";
        ncSubtext.style.display = "none";
        recordRow.classList.remove("has-nc");
      }

      document.getElementById("info-points").textContent = totalPoints;
      const totalFightsCount = data.fights ? data.fights.length : 0;
      document.getElementById("info-avg").textContent =
        totalFightsCount > 0
          ? (totalPoints / totalFightsCount).toFixed(2)
          : "0.00";

      const bestWinCell = document.getElementById("info-best-win");
      if (bestWins.length > 0) {
        const randomIndex = Math.floor(Math.random() * bestWins.length);
        const randomBestFight = bestWins[randomIndex];
        bestWinCell.textContent = `${randomBestFight.tier} - ${randomBestFight.opponent} (1 of ${bestWins.length})`;
      } else {
        bestWinCell.textContent = "None";
      }

      // ==========================================
      // ГРАФІК 1: КАР'ЄРНИЙ ШЛЯХ (LINE CHART)
      // ==========================================
      const ctxLine = document.getElementById("fightsChart").getContext("2d");
      const fightsChart = new Chart(ctxLine, {
        type: "line",
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: "Career Graph",
              data: chartDataTiers,
              borderColor: "#222222",
              borderWidth: 2,
              pointBackgroundColor: pointColors,
              pointBorderColor: pointColors,
              pointRadius: 6,
              pointHoverRadius: 9,
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              title: { display: true, text: "Fight Number", color: "#666" },
              ticks: { color: "#888" },
              grid: { color: "#111" },
            },
            y: {
              min: 0,
              max: 8,
              ticks: {
                stepSize: 1,
                callback: function (value) {
                  return tierLabels[value];
                },
                color: "#888",
              },
              grid: { color: "#111" },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function (context) {
                  return `Fight #${context[0].label}`;
                },
                label: function (context) {
                  const idx = context.dataIndex;
                  return ` Opponent: ${hoverOpponents[idx]} (${hoverResults[idx]}) | Tier: ${hoverTiers[idx]}`;
                },
              },
            },
          },
        },
        plugins: [
          {
            id: "customCanvasBackgroundColor",
            beforeDraw: (chart) => {
              const { ctx } = chart;
              ctx.save();
              ctx.globalCompositeOperation = "destination-over";
              ctx.fillStyle = "#050505";
              ctx.fillRect(0, 0, chart.width, chart.height);
              ctx.restore();
            },
          },
        ],
      });

      const toggleInput = document.getElementById("chart-toggle");
      const labelTiers = document.getElementById("label-tiers");
      const labelPoints = document.getElementById("label-points");

      toggleInput.addEventListener("change", (e) => {
        if (e.target.checked) {
          labelTiers.classList.remove("active");
          labelPoints.classList.add("active");
          fightsChart.data.datasets[0].data = chartDataPoints;
          fightsChart.options.scales.y.min = 0;
          fightsChart.options.scales.y.max = 40;
          fightsChart.options.scales.y.ticks.stepSize = undefined;
          fightsChart.options.scales.y.ticks.callback = function (value) {
            return value + " pts";
          };
        } else {
          labelTiers.classList.add("active");
          labelPoints.classList.remove("active");
          fightsChart.data.datasets[0].data = chartDataTiers;
          fightsChart.options.scales.y.min = 0;
          fightsChart.options.scales.y.max = 8;
          fightsChart.options.scales.y.ticks.stepSize = 1;
          fightsChart.options.scales.y.ticks.callback = function (value) {
            return tierLabels[value];
          };
        }
        fightsChart.update();
      });

      document
        .getElementById("download-chart")
        .addEventListener("click", () => {
          const currentMode = toggleInput.checked ? "points" : "tiers";
          const link = document.createElement("a");
          link.download = `${data.id}_career_${currentMode}_chart.png`;
          link.href = document
            .getElementById("fightsChart")
            .toDataURL("image/png");
          link.click();
        });

      const pieTooltipOptions = {
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return ` Tier ${label}: ${value} fights (${percentage}%)`;
          },
        },
      };

      // ==========================================
      // ГРАФІК 2: ДІАГРАМА ПЕРЕМОГ (WINS PIE - СОРТОВАНА)
      // ==========================================
      // Фільтруємо еталонний масив, залишаючи лише ті тіри, які реально є в перемогах
      const winLabels = sortedTierOrder.filter(
        (tier) => winTiersCount[tier] > 0,
      );
      const winData = winLabels.map((tier) => winTiersCount[tier]);
      const winColors = winLabels.map((tier) => tierColorsMap[tier] || "#333");

      const ctxWinPie = document
        .getElementById("winsPieChart")
        .getContext("2d");
      new Chart(ctxWinPie, {
        type: "doughnut",
        data: {
          labels: winLabels,
          datasets: [
            {
              data: winData,
              backgroundColor: winColors,
              borderWidth: 1,
              borderColor: "#000000",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#aaa", font: { size: 11 } },
            },
            tooltip: pieTooltipOptions,
          },
        },
      });

      // ==========================================
      // ГРАФІК 3: ДІАГРАМА ПОРАЗОК (LOSSES PIE - СОРТОВАНА)
      // ==========================================
      const lossPieWrapper = document.getElementById("loss-pie-wrapper");

      if (losses > 0) {
        lossPieWrapper.style.display = "block";

        // Фільтруємо еталонний масив для поразок
        const lossLabels = sortedTierOrder.filter(
          (tier) => lossTiersCount[tier] > 0,
        );
        const lossData = lossLabels.map((tier) => lossTiersCount[tier]);
        const lossColors = lossLabels.map(
          (tier) => tierColorsMap[tier] || "#333",
        );

        const ctxLossPie = document
          .getElementById("lossesPieChart")
          .getContext("2d");
        new Chart(ctxLossPie, {
          type: "doughnut",
          data: {
            labels: lossLabels,
            datasets: [
              {
                data: lossData,
                backgroundColor: lossColors,
                borderWidth: 1,
                borderColor: "#000000",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { color: "#aaa", font: { size: 11 } },
              },
              tooltip: pieTooltipOptions,
            },
          },
        });
      } else {
        lossPieWrapper.style.display = "none";
      }
    })
    .catch((error) => {
      console.error("Error loading data:", error);
      document.getElementById("boxer-name").textContent = "Error Loading Data";
    });
});
