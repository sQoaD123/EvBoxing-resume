document.addEventListener("DOMContentLoaded", () => {
  // Список усіх наших 14 боксерів (назви файлів без .json)
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

  let globalLeaderboardData = []; // Сюди зберемо прораховані дані всіх бійців
  let leaderboardChart = null; // Екземпляр Chart.js
  let currentMode = "points"; // Поточний режим за замовчуванням

  // 1. Функція завантаження та парсингу всіх файлів
  const loadAllBoxersData = async () => {
    try {
      const fetchPromises = boxerIds.map((id) =>
        fetch(`data/boxers/${id}.json`).then((res) => {
          if (!res.ok) throw new Error(`Failed to load ${id}`);
          return res.json();
        }),
      );

      const allBoxers = await Promise.all(fetchPromises);

      // Обраховуємо метрики для кожного боксера
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
          name: boxer.name,
          points: totalPoints,
          avg: avgPoints,
          sWins: sAndSPlusWins,
        };
      });

      // Коли всі дані зібрані — будуємо початковий графік
      initChart();
    } catch (error) {
      console.error("Error loading leaderboard data:", error);
    }
  };

  // 2. Функція ініціалізації та оновлення графіка
  const initChart = () => {
    // Сортуємо дані за зростанням (ascending: від найменшого до найбільшого)
    globalLeaderboardData.sort((a, b) => {
      if (currentMode === "points") return a.points - b.points;
      if (currentMode === "avg") return a.avg - b.avg;
      if (currentMode === "s-tier") return a.sWins - b.sWins;
      return 0;
    });

    // Витягуємо масиви для Chart.js
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

    const ctx = document.getElementById("leaderboardChart").getContext("2d");

    // Якщо графік уже існує — просто оновлюємо дані, щоб була гарна анімація
    if (leaderboardChart) {
      leaderboardChart.data.labels = labels;
      leaderboardChart.data.datasets[0].data = chartData;
      leaderboardChart.data.datasets[0].label = labelDataText;
      leaderboardChart.update();
      return;
    }

    // Перший запуск: створюємо об'єкт вертикального бару (bar chart)
    leaderboardChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: labelDataText,
            data: chartData,
            backgroundColor: "rgba(255, 255, 255, 0.08)", // Світло-сірі стильні стовпчики
            borderColor: "#ffffff", // Біла контрастна рамка
            borderWidth: 1,
            hoverBackgroundColor: "#ffffff", // При ховері стовпчик повністю біліє
            hoverBorderColor: "#ffffff",
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
            grid: { display: false }, // Ховаємо вертикальні лінії сітки для чистоти
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#888" },
            grid: { color: "#111" },
          },
        },
        plugins: {
          legend: { display: false }, // Ховаємо легенду, бо назва є в тултіпі
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
    });
  };

  // 3. Обробка кліків по кнопках режимів
  const buttons = document.querySelectorAll(".rank-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Змінюємо активний клас на кнопках
      buttons.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      // Оновлюємо режим і перемальовуємо графік
      currentMode = e.target.getAttribute("data-mode");
      initChart();
    });
  });

  // Запуск системи
  loadAllBoxersData();
});
