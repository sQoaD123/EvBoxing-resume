document.addEventListener("DOMContentLoaded", () => {
  // Список усіх наших боксерів
  const boxerIds = [
    "usyk",
    "joshua",
    "wilder",
    "mayweather",
    "davis",
    "pacquiao",
    "tyson",
    "inoue",
    "hamed",
    "jones",
    "canelo",
    "leonard",
    "crawford",
    "lomachenko",
    "lewis",
    "fury",
    "hopkins",
  ];

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

  let globalLeaderboardData = [];
  let leaderboardChart = null;
  let currentMode = "points";

  // Кеш для фотографій
  const imageCache = {};
  boxerIds.forEach((id) => {
    const img = new Image();
    img.src = `images/${id}.png`;
    imageCache[id] = img;
  });

  const loadAllBoxersData = async () => {
    try {
      const fetchPromises = boxerIds.map((id) =>
        fetch(`data/boxers/${id}.json`).then((res) => {
          if (!res.ok) throw new Error(`Failed to load ${id}`);
          return res.json();
        }),
      );

      const allBoxers = await Promise.all(fetchPromises);

      globalLeaderboardData = allBoxers.map((boxer) => {
        let totalPoints = 0;
        let sAndSPlusWins = 0;
        const totalFights = boxer.fights ? boxer.fights.length : 0;

        if (boxer.fights && totalFights > 0) {
          boxer.fights.forEach((fight) => {
            const res = fight.result.toUpperCase();
            const tier = fight.tier ? fight.tier.toUpperCase() : "D";

            if (res.startsWith("W-")) {
              totalPoints += tierPoints[tier] || 0;
              if (tier === "S" || tier === "S+") {
                sAndSPlusWins++;
              }
            }
          });
        }

        const avgPoints =
          totalFights > 0
            ? parseFloat((totalPoints / totalFights).toFixed(2))
            : 0;

        return {
          id: boxer.id,
          name: boxer.name,
          points: totalPoints,
          avg: avgPoints,
          sWins: sAndSPlusWins,
        };
      });

      initChart();
    } catch (error) {
      console.error("Error loading leaderboard data:", error);
    }
  };

  const initChart = () => {
    globalLeaderboardData.sort((a, b) => {
      if (currentMode === "points") return a.points - b.points;
      if (currentMode === "avg") return a.avg - b.avg;
      if (currentMode === "s-tier") return a.sWins - b.sWins;
      return 0;
    });

    const labels = globalLeaderboardData.map((b) => b.name);
    let chartData = [];
    let labelDataText = "";

    if (currentMode === "points") {
      chartData = globalLeaderboardData.map((b) => b.points);
      labelDataText = "Total Points";
    } else if (currentMode === "avg") {
      chartData = globalLeaderboardData.map((b) => b.avg);
      labelDataText = "AVG Points per Fight";
    } else if (currentMode === "s-tier") {
      chartData = globalLeaderboardData.map((b) => b.sWins);
      labelDataText = "S / S+ Wins Count";
    }

    const len = globalLeaderboardData.length;
    const backgroundColors = [];
    const borderColors = [];

    // ОНОВЛЕНА СВІТЛА ПАЛІТРА ДЛЯ КОЛОНОК
    for (let i = 0; i < len; i++) {
      if (i === len - 1) {
        // 1 місце — Золото (яскравіше)
        backgroundColors.push("rgba(212, 175, 55, 0.45)");
        borderColors.push("#D4AF37");
      } else if (i === len - 2) {
        // 2 місце — Срібло (яскравіше)
        backgroundColors.push("rgba(192, 192, 192, 0.45)");
        borderColors.push("#C0C0C0");
      } else if (i === len - 3) {
        // 3 місце — Бронза (яскравіше)
        backgroundColors.push("rgba(205, 127, 50, 0.5)");
        borderColors.push("#CD7F32");
      } else {
        // Решта боксерів — видимий напівпрозорий світло-сірий тон
        backgroundColors.push("rgba(255, 255, 255, 0.12)");
        borderColors.push("rgba(255, 255, 255, 0.4)");
      }
    }

    const ctx = document.getElementById("leaderboardChart").getContext("2d");

    if (leaderboardChart) {
      leaderboardChart.data.labels = labels;
      leaderboardChart.data.datasets[0].data = chartData;
      leaderboardChart.data.datasets[0].label = labelDataText;
      leaderboardChart.data.datasets[0].backgroundColor = backgroundColors;
      leaderboardChart.data.datasets[0].borderColor = borderColors;
      leaderboardChart.data.datasets[0].hoverBackgroundColor = borderColors;
      leaderboardChart.data.datasets[0].hoverBorderColor = borderColors;
      leaderboardChart.update();
      return;
    }

    leaderboardChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: labelDataText,
            data: chartData,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
            hoverBackgroundColor: borderColors,
            hoverBorderColor: borderColors,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: "#888", font: { size: 10 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            grace: "18%",
            ticks: { color: "#888" },
            grid: { color: "#111" },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#050505",
            titleColor: "#fff",
            bodyColor: "#888",
            borderColor: "#222",
            borderWidth: 1,
            padding: 12,
            displayColors: false,
          },
        },
      },
      plugins: [
        {
          id: "boxerImagesOnBars",
          afterDatasetsDraw: (chart) => {
            const { ctx } = chart;
            const meta = chart.getDatasetMeta(0);

            meta.data.forEach((bar, index) => {
              const boxerId = globalLeaderboardData[index].id;
              const img = imageCache[boxerId];

              const photoWidth = 44;
              const photoHeight = 55;

              const posX = bar.x - photoWidth / 2;
              const posY = bar.y - photoHeight - 10;

              if (img && img.complete && img.naturalWidth !== 0) {
                ctx.save();
                ctx.drawImage(img, posX, posY, photoWidth, photoHeight);
                ctx.restore();
              } else {
                ctx.save();
                ctx.fillStyle = "#0a0a0a";
                ctx.strokeStyle = borderColors[index];
                ctx.lineWidth = 1;

                ctx.fillRect(posX, posY, photoWidth, photoHeight);
                ctx.strokeRect(posX, posY, photoWidth, photoHeight);

                ctx.fillStyle = "#555";
                ctx.font = "8px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(
                  boxerId.substring(0, 4).toUpperCase(),
                  bar.x,
                  posY + photoHeight / 2 + 3,
                );
                ctx.restore();
              }
            });
          },
        },
      ],
    });
  };

  const buttons = document.querySelectorAll(".rank-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      buttons.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      currentMode = e.target.getAttribute("data-mode");
      initChart();
    });
  });

  loadAllBoxersData();
});
