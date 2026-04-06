const coinsEl = document.getElementById("coins");
const loadingEl = document.getElementById("loading");
const coinTemplate = document.getElementById("coinTemplate");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const viewSelect = document.getElementById("viewSelect");
const currencySelect = document.getElementById("currencySelect");
const refreshBtn = document.getElementById("refreshBtn");
let customSelectsReady = false;

const lastUpdatedEl = document.getElementById("lastUpdated");
const refreshStatusEl = document.getElementById("refreshStatus");

const marketCapTotalEl = document.getElementById("marketCapTotal");
const volumeTotalEl = document.getElementById("volumeTotal");
const avgChangeEl = document.getElementById("avgChange");
const bullishRatioEl = document.getElementById("bullishRatio");

const watchlistListEl = document.getElementById("watchlistList");

const coinModal = document.getElementById("coinModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalIconEl = document.getElementById("modalIcon");
const modalNameEl = document.getElementById("modalName");
const modalSymbolEl = document.getElementById("modalSymbol");
const modalPriceEl = document.getElementById("modalPrice");
const modalChangeEl = document.getElementById("modalChange");
const modalRankEl = document.getElementById("modalRank");
const modalSupplyEl = document.getElementById("modalSupply");
const modalAthEl = document.getElementById("modalAth");
const modalAtlEl = document.getElementById("modalAtl");
const modal7dEl = document.getElementById("modal7d");
const modalHighLowEl = document.getElementById("modalHighLow");

const COIN_IDS = [
  "bitcoin",
  "ethereum",
  "tether",
  "binancecoin",
  "solana",
  "ripple",
  "usd-coin",
  "cardano",
  "dogecoin",
  "tron",
  "avalanche-2",
  "chainlink",
  "polkadot",
  "matic-network",
  "litecoin"
];

const state = {
  allCoins: [],
  query: "",
  sortBy: "marketCap",
  view: "all",
  currency: loadCurrency(),
  fxRates: {
    usd: 1,
    eur: 0.92,
    inr: 83.2,
    gbp: 0.79,
    jpy: 150,
    cad: 1.35,
    aud: 1.52
  },
  refreshIn: 60,
  countdownTimer: null,
  favoriteIds: new Set(loadFavorites()),
  favoriteOrder: loadFavoriteOrder()
};

const CURRENCY_LOCALE = {
  usd: "en-US",
  eur: "de-DE",
  inr: "en-IN",
  gbp: "en-GB",
  jpy: "ja-JP",
  cad: "en-CA",
  aud: "en-AU"
};

function loadCurrency() {
  const value = localStorage.getItem("crypto-dashboard-currency");
  return value || "usd";
}

function saveCurrency() {
  localStorage.setItem("crypto-dashboard-currency", state.currency);
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem("crypto-dashboard-favorites");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadFavoriteOrder() {
  try {
    const raw = localStorage.getItem("crypto-dashboard-favorite-order");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem("crypto-dashboard-favorites", JSON.stringify(Array.from(state.favoriteIds)));
}

function saveFavoriteOrder() {
  localStorage.setItem("crypto-dashboard-favorite-order", JSON.stringify(state.favoriteOrder));
}

function convertFromUsd(value) {
  if (typeof value !== "number") return null;
  const rate = state.fxRates[state.currency] || 1;
  return value * rate;
}

function formatMoney(value) {
  if (typeof value !== "number") return "--";
  const converted = convertFromUsd(value);
  if (converted === null) return "--";
  return new Intl.NumberFormat(CURRENCY_LOCALE[state.currency], {
    style: "currency",
    currency: state.currency.toUpperCase(),
    maximumFractionDigits: converted >= 1000 ? 0 : 2
  }).format(converted);
}

function formatCompactMoney(value) {
  if (typeof value !== "number") return "--";
  const converted = convertFromUsd(value);
  if (converted === null) return "--";
  return new Intl.NumberFormat(CURRENCY_LOCALE[state.currency], {
    style: "currency",
    currency: state.currency.toUpperCase(),
    notation: "compact",
    maximumFractionDigits: 2
  }).format(converted);
}

function formatPercent(value) {
  if (typeof value !== "number") return "--";
  const sign = value >= 0 ? "+" : "";
  return sign + value.toFixed(2) + "%";
}

function setLoading(message, isError = false) {
  if (!loadingEl) return;
  loadingEl.textContent = message;
  loadingEl.classList.toggle("error", isError);
}

function closeAllCustomSelects(except) {
  [sortSelect, viewSelect, currencySelect].forEach((selectEl) => {
    if (!selectEl || selectEl === except || !selectEl._customSelect) return;
    selectEl._customSelect.menu.hidden = true;
    selectEl._customSelect.trigger.setAttribute("aria-expanded", "false");
  });
}

function syncCustomSelect(selectEl) {
  if (!selectEl || !selectEl._customSelect) return;
  const selectedOption = selectEl.options[selectEl.selectedIndex];
  selectEl._customSelect.trigger.textContent = selectedOption ? selectedOption.textContent : "Select";

  const optionButtons = selectEl._customSelect.menu.querySelectorAll(".custom-select-option");
  optionButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.value === selectEl.value);
  });
}

function setupCustomSelect(selectEl) {
  if (!selectEl || selectEl._customSelect) return;

  selectEl.classList.add("native-select-hidden");

  const wrapper = document.createElement("div");
  wrapper.className = "custom-select";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const menu = document.createElement("ul");
  menu.className = "custom-select-menu";
  menu.hidden = true;

  Array.from(selectEl.options).forEach((option) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "custom-select-option";
    button.textContent = option.textContent;
    button.dataset.value = option.value;

    button.addEventListener("click", () => {
      selectEl.value = option.value;
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      syncCustomSelect(selectEl);
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    });

    item.appendChild(button);
    menu.appendChild(item);
  });

  trigger.addEventListener("click", () => {
    const open = !menu.hidden;
    closeAllCustomSelects(selectEl);
    menu.hidden = open;
    trigger.setAttribute("aria-expanded", String(!open));
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);
  selectEl.insertAdjacentElement("afterend", wrapper);

  selectEl._customSelect = { wrapper, trigger, menu };
  syncCustomSelect(selectEl);
}

function setupCustomSelects() {
  if (customSelectsReady) return;
  setupCustomSelect(sortSelect);
  setupCustomSelect(viewSelect);
  setupCustomSelect(currencySelect);
  customSelectsReady = true;
}

async function fetchFxRates() {
  try {
    const response = await fetch(
      "https://api.exchangerate.host/latest?base=USD&symbols=EUR,INR,GBP,JPY,CAD,AUD"
    );
    if (!response.ok) return;
    const data = await response.json();
    if (!data || !data.rates) return;

    state.fxRates = {
      usd: 1,
      eur: data.rates.EUR || state.fxRates.eur,
      inr: data.rates.INR || state.fxRates.inr,
      gbp: data.rates.GBP || state.fxRates.gbp,
      jpy: data.rates.JPY || state.fxRates.jpy,
      cad: data.rates.CAD || state.fxRates.cad,
      aud: data.rates.AUD || state.fxRates.aud
    };
  } catch {
    // Keep fallback static rates on any failure.
  }
}

function updateSummary(coins) {
  if (!coins.length) {
    marketCapTotalEl.textContent = "--";
    volumeTotalEl.textContent = "--";
    avgChangeEl.textContent = "--";
    bullishRatioEl.textContent = "--";
    return;
  }

  const totalMarketCap = coins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
  const totalVolume = coins.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
  const avgChange =
    coins.reduce((sum, coin) => sum + (coin.price_change_percentage_24h || 0), 0) / coins.length;
  const bullishCount = coins.filter((coin) => (coin.price_change_percentage_24h || 0) >= 0).length;
  const ratio = (bullishCount / coins.length) * 100;

  marketCapTotalEl.textContent = formatCompactMoney(totalMarketCap);
  volumeTotalEl.textContent = formatCompactMoney(totalVolume);
  avgChangeEl.textContent = formatPercent(avgChange);
  bullishRatioEl.textContent = ratio.toFixed(0) + "%";

  avgChangeEl.style.color = avgChange >= 0 ? "var(--positive)" : "var(--negative)";
}

function buildSparklinePoints(prices) {
  if (!Array.isArray(prices) || prices.length < 2) return "";

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const stepX = 100 / (prices.length - 1);

  return prices
    .map((price, index) => {
      const x = index * stepX;
      const normalized = (price - min) / range;
      const y = 28 - normalized * 26;
      return x.toFixed(2) + "," + y.toFixed(2);
    })
    .join(" ");
}

function getProcessedCoins() {
  const q = state.query.trim().toLowerCase();

  let list = [...state.allCoins];

  if (q) {
    list = list.filter((coin) => {
      return coin.name.toLowerCase().includes(q) || coin.symbol.toLowerCase().includes(q);
    });
  }

  if (state.view === "gainers") {
    list = list.filter((coin) => (coin.price_change_percentage_24h || 0) >= 0);
  }

  if (state.view === "losers") {
    list = list.filter((coin) => (coin.price_change_percentage_24h || 0) < 0);
  }

  if (state.view === "favorites") {
    list = list.filter((coin) => state.favoriteIds.has(coin.id));
  }

  if (state.view === "stable") {
    list = list.filter((coin) => Math.abs(coin.price_change_percentage_24h || 0) < 2);
  }

  if (state.view === "highVolume") {
    list = list.filter((coin) => (coin.total_volume || 0) >= 1000000000);
  }

  if (state.view === "largeCap") {
    list = list.filter((coin) => (coin.market_cap || 0) >= 10000000000);
  }

  list.sort((a, b) => {
    if (state.sortBy === "price") return (b.current_price || 0) - (a.current_price || 0);
    if (state.sortBy === "change24h") {
      return (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0);
    }
    if (state.sortBy === "change7d") {
      const a7 = get7dChange(a);
      const b7 = get7dChange(b);
      return b7 - a7;
    }
    if (state.sortBy === "volume") return (b.total_volume || 0) - (a.total_volume || 0);
    if (state.sortBy === "nameAsc") return a.name.localeCompare(b.name);
    if (state.sortBy === "nameDesc") return b.name.localeCompare(a.name);
    return (b.market_cap || 0) - (a.market_cap || 0);
  });

  return list;
}

function get7dChange(coin) {
  const prices7d = coin.sparkline_in_7d?.price || [];
  const first = prices7d[0] || coin.current_price || 0;
  const last = prices7d[prices7d.length - 1] || coin.current_price || 0;
  return first ? ((last - first) / first) * 100 : 0;
}

function renderCoins() {
  coinsEl.innerHTML = "";
  const list = getProcessedCoins();

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No coins match this filter.";
    coinsEl.appendChild(empty);
    return;
  }

  list.forEach((coin, index) => {
    const node = coinTemplate.content.firstElementChild.cloneNode(true);
    node.style.setProperty("--i", String(index));

    const iconEl = node.querySelector(".coin-icon");
    const nameEl = node.querySelector(".coin-name");
    const symbolEl = node.querySelector(".coin-symbol");
    const priceEl = node.querySelector(".coin-price");
    const changeEl = node.querySelector(".coin-change");
    const marketCapEl = node.querySelector(".metric-marketcap");
    const volumeEl = node.querySelector(".metric-volume");
    const sparklinePath = node.querySelector(".sparkline-path");
    const favBtn = node.querySelector(".fav-btn");

    iconEl.src = coin.image;
    iconEl.alt = coin.name + " icon";
    nameEl.textContent = coin.name;
    symbolEl.textContent = coin.symbol.toUpperCase();
    priceEl.textContent = formatMoney(coin.current_price);

    const change = coin.price_change_percentage_24h || 0;
    changeEl.textContent = formatPercent(change) + " today";
    changeEl.classList.add(change >= 0 ? "up" : "down");

    marketCapEl.textContent = formatCompactMoney(coin.market_cap);
    volumeEl.textContent = formatCompactMoney(coin.total_volume);

    const points = buildSparklinePoints(coin.sparkline_in_7d?.price || []);
    sparklinePath.setAttribute("points", points);
    sparklinePath.style.stroke = change >= 0 ? "var(--positive)" : "var(--negative)";

    const isFavorite = state.favoriteIds.has(coin.id);
    favBtn.textContent = isFavorite ? "★" : "☆";
    favBtn.classList.toggle("active", isFavorite);
    favBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state.favoriteIds.has(coin.id)) {
        state.favoriteIds.delete(coin.id);
        state.favoriteOrder = state.favoriteOrder.filter((id) => id !== coin.id);
      } else {
        state.favoriteIds.add(coin.id);
        if (!state.favoriteOrder.includes(coin.id)) state.favoriteOrder.push(coin.id);
      }
      saveFavorites();
      saveFavoriteOrder();
      renderWatchlist();
      renderCoins();
    });

    node.addEventListener("click", () => {
      openCoinModal(coin);
    });

    coinsEl.appendChild(node);
  });
}

function getOrderedFavorites() {
  const byId = new Map(state.allCoins.map((coin) => [coin.id, coin]));
  const cleaned = state.favoriteOrder.filter((id) => state.favoriteIds.has(id) && byId.has(id));

  state.favoriteIds.forEach((id) => {
    if (!cleaned.includes(id) && byId.has(id)) cleaned.push(id);
  });

  state.favoriteOrder = cleaned;
  saveFavoriteOrder();
  return cleaned.map((id) => byId.get(id));
}

function renderWatchlist() {
  watchlistListEl.innerHTML = "";
  const favorites = getOrderedFavorites();

  if (!favorites.length) {
    const li = document.createElement("li");
    li.className = "watch-empty";
    li.textContent = "No favorites yet. Tap the star on any coin.";
    watchlistListEl.appendChild(li);
    return;
  }

  favorites.forEach((coin) => {
    const li = document.createElement("li");
    li.className = "watch-item";
    li.draggable = true;
    li.dataset.coinId = coin.id;
    li.textContent = coin.symbol.toUpperCase() + "  " + formatPercent(coin.price_change_percentage_24h || 0);

    li.addEventListener("click", () => openCoinModal(coin));

    li.addEventListener("dragstart", () => {
      li.classList.add("dragging");
    });

    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
    });

    watchlistListEl.appendChild(li);
  });
}

watchlistListEl.addEventListener("dragover", (event) => {
  event.preventDefault();
  const dragging = watchlistListEl.querySelector(".dragging");
  if (!dragging) return;

  const siblings = Array.from(watchlistListEl.querySelectorAll(".watch-item:not(.dragging)"));
  const next = siblings.find((node) => {
    const rect = node.getBoundingClientRect();
    return event.clientX <= rect.left + rect.width / 2;
  });

  if (next) {
    watchlistListEl.insertBefore(dragging, next);
  } else {
    watchlistListEl.appendChild(dragging);
  }
});

watchlistListEl.addEventListener("drop", () => {
  const ordered = Array.from(watchlistListEl.querySelectorAll(".watch-item")).map(
    (node) => node.dataset.coinId
  );
  if (!ordered.length) return;
  state.favoriteOrder = ordered;
  saveFavoriteOrder();
});

function openCoinModal(coin) {
  modalIconEl.src = coin.image;
  modalIconEl.alt = coin.name + " icon";
  modalNameEl.textContent = coin.name;
  modalSymbolEl.textContent = coin.symbol;
  modalPriceEl.textContent = formatMoney(coin.current_price);

  const c24 = coin.price_change_percentage_24h || 0;
  modalChangeEl.textContent = formatPercent(c24) + " in 24h";
  modalChangeEl.style.color = c24 >= 0 ? "var(--positive)" : "var(--negative)";

  const change7d = get7dChange(coin);

  modalRankEl.textContent = coin.market_cap_rank ? "#" + coin.market_cap_rank : "--";
  modalSupplyEl.textContent =
    typeof coin.circulating_supply === "number"
      ? Math.round(coin.circulating_supply).toLocaleString()
      : "--";
  modalAthEl.textContent = formatMoney(coin.ath);
  modalAtlEl.textContent = formatMoney(coin.atl);
  modal7dEl.textContent = formatPercent(change7d);
  modal7dEl.style.color = change7d >= 0 ? "var(--positive)" : "var(--negative)";
  modalHighLowEl.textContent = formatMoney(coin.high_24h) + " / " + formatMoney(coin.low_24h);

  coinModal.showModal();
}

function closeCoinModal() {
  if (coinModal.open) coinModal.close();
}

function updateTimestamps() {
  const now = new Date();
  lastUpdatedEl.textContent = "Last updated: " + now.toLocaleTimeString();
  refreshStatusEl.textContent = "Next refresh in " + state.refreshIn + "s";
}

function startCountdown() {
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  state.refreshIn = 60;
  updateTimestamps();

  state.countdownTimer = setInterval(() => {
    state.refreshIn -= 1;
    if (state.refreshIn <= 0) {
      fetchMarketData();
      return;
    }
    refreshStatusEl.textContent = "Next refresh in " + state.refreshIn + "s";
  }, 1000);
}

async function fetchMarketData() {
  setLoading("Loading market data...");

  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" +
    COIN_IDS.join(",") +
    "&sparkline=true&price_change_percentage=24h,7d";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Request failed");
    }

    const data = await response.json();

    if (!Array.isArray(data) || !data.length) {
      throw new Error("No data");
    }

    state.allCoins = data;
    updateSummary(data);
    renderWatchlist();
    renderCoins();
    updateTimestamps();
    startCountdown();
  } catch {
    if (!state.allCoins.length) {
      setLoading("Could not load prices. Try again in a few seconds.", true);
    }
    refreshStatusEl.textContent = "Refresh failed - retrying shortly";
  }
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderCoins();
});

currencySelect.addEventListener("change", (event) => {
  state.currency = event.target.value;
  saveCurrency();
  updateSummary(state.allCoins);
  renderWatchlist();
  renderCoins();
});

sortSelect.addEventListener("change", (event) => {
  state.sortBy = event.target.value;
  renderCoins();
});

viewSelect.addEventListener("change", (event) => {
  state.view = event.target.value;
  renderCoins();
});

refreshBtn.addEventListener("click", () => {
  fetchMarketData();
});

modalCloseBtn.addEventListener("click", () => {
  closeCoinModal();
});

coinModal.addEventListener("click", (event) => {
  const rect = coinModal.getBoundingClientRect();
  const inDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!inDialog) closeCoinModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCoinModal();
    closeAllCustomSelects();
  }
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest(".custom-select")) {
    closeAllCustomSelects();
  }
});

async function bootstrap() {
  if (!CURRENCY_LOCALE[state.currency]) {
    state.currency = "usd";
    saveCurrency();
  }

  sortSelect.value = state.sortBy;
  viewSelect.value = state.view;
  currencySelect.value = state.currency;
  setupCustomSelects();
  await fetchFxRates();
  await fetchMarketData();
}

bootstrap();