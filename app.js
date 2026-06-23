const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

const STORAGE_KEY = "blackjack-counter-v1";
const TEMPLATE_WIDTH = 28;
const TEMPLATE_HEIGHT = 36;
const RANK_CONFIDENCE_THRESHOLD = 0.44;
const VPN_COUNTRIES = [
  { value: "argentine", label: "Argentine" },
  { value: "azerbaidjan", label: "Azerbaidjan" },
  { value: "bresil", label: "Bresil" },
  { value: "hongrie", label: "Hongrie" },
  { value: "philippines", label: "Philippines" },
  { value: "pologne", label: "Pologne" },
  { value: "roumanie", label: "Roumanie" },
  { value: "afrique-du-sud", label: "Afrique du Sud" },
  { value: "tanzanie", label: "Tanzanie" },
];

const state = {
  deckCount: 6,
  baseBet: 10,
  vpn: createDefaultVpnState(),
  rules: createDefaultRules(),
  history: [],
  roundHistory: [],
  table: createDefaultTable(1),
  quickTarget: "counter",
  detections: [],
  photoLoaded: false,
  photoName: "",
  photoImage: null,
};

const elements = {
  runningCount: document.querySelector("#runningCount"),
  trueCount: document.querySelector("#trueCount"),
  seenCount: document.querySelector("#seenCount"),
  decksRemaining: document.querySelector("#decksRemaining"),
  resultPanel: document.querySelector("#resultPanel"),
  resultTitle: document.querySelector("#resultTitle"),
  resultAction: document.querySelector("#resultAction"),
  resultBet: document.querySelector("#resultBet"),
  resultPlay: document.querySelector("#resultPlay"),
  resultReason: document.querySelector("#resultReason"),
  deckCount: document.querySelector("#deckCount"),
  baseBet: document.querySelector("#baseBet"),
  vpnBox: document.querySelector("#vpnBox"),
  vpnCountrySelect: document.querySelector("#vpnCountrySelect"),
  vpnToggleButton: document.querySelector("#vpnToggleButton"),
  vpnState: document.querySelector("#vpnState"),
  vpnStatus: document.querySelector("#vpnStatus"),
  dealerSoft17Rule: document.querySelector("#dealerSoft17Rule"),
  surrenderAllowed: document.querySelector("#surrenderAllowed"),
  doubleAfterSplitAllowed: document.querySelector("#doubleAfterSplitAllowed"),
  insuranceAllowed: document.querySelector("#insuranceAllowed"),
  splitAcesOneCard: document.querySelector("#splitAcesOneCard"),
  edgeStatus: document.querySelector("#edgeStatus"),
  betSuggestion: document.querySelector("#betSuggestion"),
  playerCount: document.querySelector("#playerCount"),
  countTableButton: document.querySelector("#countTableButton"),
  clearTableButton: document.querySelector("#clearTableButton"),
  dealButton: document.querySelector("#dealButton"),
  doubleBetsButton: document.querySelector("#doubleBetsButton"),
  clearBetsButton: document.querySelector("#clearBetsButton"),
  undoBetButton: document.querySelector("#undoBetButton"),
  roundBetSummary: document.querySelector("#roundBetSummary"),
  roundBetDetail: document.querySelector("#roundBetDetail"),
  memorySummary: document.querySelector("#memorySummary"),
  passedCardsSummary: document.querySelector("#passedCardsSummary"),
  roundMemoryList: document.querySelector("#roundMemoryList"),
  clearRoundMemoryButton: document.querySelector("#clearRoundMemoryButton"),
  tableStatus: document.querySelector("#tableStatus"),
  roundSteps: document.querySelector("#roundSteps"),
  dealerHand: document.querySelector(".dealer-hand"),
  dealerSummary: document.querySelector("#dealerSummary"),
  dealerRecommendation: document.querySelector("#dealerRecommendation"),
  dealerCards: document.querySelector("#dealerCards"),
  dealerCardSelect: document.querySelector("#dealerCardSelect"),
  selectDealerButton: document.querySelector("#selectDealerButton"),
  addDealerCardButton: document.querySelector("#addDealerCardButton"),
  clearDealerButton: document.querySelector("#clearDealerButton"),
  playersContainer: document.querySelector("#playersContainer"),
  undoButton: document.querySelector("#undoButton"),
  resetButton: document.querySelector("#resetButton"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  quickTargetSelect: document.querySelector("#quickTargetSelect"),
  quickTargetStatus: document.querySelector("#quickTargetStatus"),
  rankGrid: document.querySelector("#rankGrid"),
  historyList: document.querySelector("#historyList"),
  photoInput: document.querySelector("#photoInput"),
  analyzeButton: document.querySelector("#analyzeButton"),
  addDetectedButton: document.querySelector("#addDetectedButton"),
  addMissingButton: document.querySelector("#addMissingButton"),
  detectionSummary: document.querySelector("#detectionSummary"),
  detectionList: document.querySelector("#detectionList"),
  photoCanvas: document.querySelector("#photoCanvas"),
};

const photoContext = elements.photoCanvas?.getContext("2d", { willReadFrequently: true }) || null;
let rankTemplates = null;

function createDefaultVpnState() {
  return {
    enabled: false,
    country: VPN_COUNTRIES[0].value,
  };
}

function createDefaultRules() {
  return {
    dealerHitsSoft17: false,
    surrenderAllowed: true,
    doubleAfterSplitAllowed: true,
    insuranceAllowed: true,
    splitAcesOneCard: true,
  };
}

function createDefaultTable(playerCount) {
  return {
    playerCount,
    countedCounts: {},
    roundStarted: false,
    betHistory: [],
    roundBet: 10,
    dealerCards: [],
    players: Array.from({ length: playerCount }, (_, index) => createPlayer(index + 1)),
  };
}

function createPlayer(number) {
  return {
    id: createId(),
    number,
    hands: [createHand()],
  };
}

function createHand(cards = [], options = {}) {
  return {
    id: createId(),
    cards,
    status: "playing",
    betAmount: Number.isFinite(options.betAmount) ? options.betAmount : 10,
    betMultiplier: 1,
    actionLog: [],
    pendingAction: "",
    fromSplit: Boolean(options.fromSplit),
    splitAces: Boolean(options.splitAces),
  };
}

function deltaForRank(rank) {
  if (["2", "3", "4", "5", "6"].includes(rank)) return 1;
  if (["10", "J", "Q", "K", "A"].includes(rank)) return -1;
  return 0;
}

function signed(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function createId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    if (Number.isFinite(saved.deckCount)) state.deckCount = saved.deckCount;
    if (Number.isFinite(saved.baseBet)) state.baseBet = saved.baseBet;
    if (saved.vpn) state.vpn = normalizeVpnState(saved.vpn);
    if (saved.rules) state.rules = normalizeRules(saved.rules);
    if (Array.isArray(saved.history)) {
      state.history = saved.history.filter((entry) => RANKS.includes(entry.rank));
    }
    if (Array.isArray(saved.roundHistory)) {
      state.roundHistory = saved.roundHistory.map(normalizeArchivedRound).filter(Boolean).slice(0, 100);
    }
    if (saved.table) {
      state.table = normalizeTable(saved.table);
    } else if (!isBettingLocked()) {
      applyRoundBet(state.baseBet);
    }
    if (typeof saved.quickTarget === "string") state.quickTarget = saved.quickTarget;
  } catch (error) {
    console.warn("Impossible de charger la sauvegarde du compteur.", error);
  }
}

function saveState() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        deckCount: state.deckCount,
        baseBet: state.baseBet,
        vpn: state.vpn,
        rules: state.rules,
        history: state.history,
        roundHistory: state.roundHistory,
        table: state.table,
        quickTarget: state.quickTarget,
      })
    );
  } catch (error) {
    console.warn("Impossible de sauvegarder le compteur.", error);
  }
}

function normalizeVpnState(vpn) {
  const defaults = createDefaultVpnState();
  const country = getVpnCountry(vpn.country)?.value || defaults.country;

  return {
    enabled: Boolean(vpn.enabled),
    country,
  };
}

function getVpnCountry(value) {
  return VPN_COUNTRIES.find((country) => country.value === value);
}

function getVpnCountryLabel(value = state.vpn.country) {
  return getVpnCountry(value)?.label || VPN_COUNTRIES[0].label;
}

function normalizeRules(rules) {
  const defaults = createDefaultRules();
  return {
    dealerHitsSoft17: Boolean(rules.dealerHitsSoft17 ?? defaults.dealerHitsSoft17),
    surrenderAllowed: Boolean(rules.surrenderAllowed ?? defaults.surrenderAllowed),
    doubleAfterSplitAllowed: Boolean(rules.doubleAfterSplitAllowed ?? defaults.doubleAfterSplitAllowed),
    insuranceAllowed: Boolean(rules.insuranceAllowed ?? defaults.insuranceAllowed),
    splitAcesOneCard: Boolean(rules.splitAcesOneCard ?? defaults.splitAcesOneCard),
  };
}

function normalizeArchivedRound(round) {
  if (!round || typeof round !== "object") return null;

  const dealerCards = normalizeCards(round.dealerCards);
  const players = Array.isArray(round.players)
    ? round.players.map((player, index) => ({
        number: Math.max(1, Math.round(Number(player.number) || index + 1)),
        hands: Array.isArray(player.hands)
          ? player.hands.map((hand) => ({
              cards: normalizeCards(hand.cards),
              betAmount: Math.max(0, Math.round(Number(hand.betAmount) || 0)),
              betMultiplier: Number.isFinite(hand.betMultiplier) ? hand.betMultiplier : 1,
              status: typeof hand.status === "string" ? hand.status : "playing",
              outcome: typeof hand.outcome === "string" ? hand.outcome : "",
            }))
          : [],
      }))
    : [];
  const cards = normalizeCards(round.cards);

  if (!dealerCards.length && !players.some((player) => player.hands.some((hand) => hand.cards.length))) return null;

  return {
    id: typeof round.id === "string" ? round.id : createId(),
    createdAt: typeof round.createdAt === "string" ? round.createdAt : new Date().toISOString(),
    dealerCards,
    players,
    cards: cards.length ? cards : [...dealerCards, ...players.flatMap((player) => player.hands.flatMap((hand) => hand.cards))],
    cardCount: Math.max(0, Math.round(Number(round.cardCount) || cards.length)),
    countDelta: Math.round(Number(round.countDelta) || 0),
    totalBet: Math.max(0, Math.round(Number(round.totalBet) || 0)),
  };
}

function normalizeTable(table) {
  const playerCount = clamp(Math.round(Number(table.playerCount) || 1), 1, 7);
  const normalized = createDefaultTable(playerCount);
  normalized.countedCounts = normalizeCountedCounts(table.countedCounts);
  normalized.roundStarted = Boolean(table.roundStarted);
  normalized.betHistory = Array.isArray(table.betHistory) ? table.betHistory.slice(-10).map(normalizeBetSnapshot).filter(Boolean) : [];
  normalized.roundBet = Math.max(0, Math.round(Number(table.roundBet) || state.baseBet || 10));
  normalized.dealerCards = normalizeCards(table.dealerCards);
  normalized.players = Array.from({ length: playerCount }, (_, index) => {
    const savedPlayer = Array.isArray(table.players) ? table.players[index] : null;
    const player = createPlayer(index + 1);

    if (savedPlayer && Array.isArray(savedPlayer.hands)) {
      player.hands = savedPlayer.hands.map((hand) => ({
        id: typeof hand.id === "string" ? hand.id : createId(),
        cards: normalizeCards(hand.cards),
        status: ["playing", "stand", "bust", "blackjack", "double", "surrender"].includes(hand.status)
          ? hand.status
          : "playing",
        betAmount: Math.max(0, Math.round(Number(hand.betAmount) || normalized.roundBet || state.baseBet || 10)),
        betMultiplier: Number.isFinite(hand.betMultiplier) ? hand.betMultiplier : 1,
        actionLog: Array.isArray(hand.actionLog) ? hand.actionLog.slice(0, 8) : [],
        pendingAction: ["hit", "double"].includes(hand.pendingAction) ? hand.pendingAction : "",
        fromSplit: Boolean(hand.fromSplit),
        splitAces: Boolean(hand.splitAces),
      }));
    }

    if (!player.hands.length) player.hands = [createHand()];
    return player;
  });

  if (
    normalized.dealerCards.length ||
    normalized.players.some((player) => player.hands.some((hand) => hand.cards.length))
  ) {
    normalized.roundStarted = true;
  }

  return normalized;
}

function normalizeBetSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;

  return {
    roundBet: Math.max(0, Math.round(Number(snapshot.roundBet) || 0)),
    playerBets: Array.isArray(snapshot.playerBets)
      ? snapshot.playerBets.map((player) =>
          Array.isArray(player) ? player.map((value) => Math.max(0, Math.round(Number(value) || 0))) : []
        )
      : [],
  };
}

function normalizeCards(cards) {
  return Array.isArray(cards) ? cards.filter((rank) => RANKS.includes(rank)) : [];
}

function normalizeCountedCounts(counts) {
  const normalized = {};
  if (!counts || typeof counts !== "object") return normalized;

  RANKS.forEach((rank) => {
    const value = Math.max(0, Math.round(Number(counts[rank]) || 0));
    if (value) normalized[rank] = value;
  });

  return normalized;
}

function getCountStats() {
  const running = state.history.reduce((total, entry) => total + entry.delta, 0);
  const seen = state.history.length;
  const totalCards = state.deckCount * 52;
  const remainingCards = Math.max(totalCards - seen, 0);
  const displayDecksRemaining = remainingCards / 52;
  const calculationDecksRemaining = Math.max(displayDecksRemaining, 0.25);
  const trueCount = running / calculationDecksRemaining;

  return {
    running,
    seen,
    displayDecksRemaining,
    trueCount,
  };
}

function renderRankGrid() {
  elements.rankGrid.replaceChildren();

  RANKS.forEach((rank) => {
    const delta = deltaForRank(rank);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `rank-button ${delta > 0 ? "positive" : ""} ${delta < 0 ? "negative" : ""}`.trim();
    button.setAttribute("aria-label", `Ajouter ${rank}, valeur ${signed(delta)}`);

    const rankLabel = document.createElement("strong");
    rankLabel.textContent = rank;

    const deltaLabel = document.createElement("span");
    deltaLabel.textContent = signed(delta);

    button.append(rankLabel, deltaLabel);
    button.addEventListener("click", () => handleRankGridClick(rank));
    elements.rankGrid.appendChild(button);
  });
}

function handleRankGridClick(rank) {
  const target = getActiveQuickTarget();

  if (target === "counter") {
    addCards([{ rank, source: "manuel" }]);
    return;
  }

  if (target === "dealer") {
    if (addRankToDealer(rank, { countIt: true })) {
      setTableStatus(`${rank} ajoutee au croupier et au compteur.`);
    }
    return;
  }

  const playerTarget = parsePlayerQuickTarget(target);
  if (playerTarget && addRankToPlayerHand(playerTarget.playerIndex, playerTarget.handIndex, rank, { countIt: true })) {
    const nextTarget = getActiveQuickTarget();
    const nextMessage =
      nextTarget !== target && nextTarget !== "counter" ? ` Prochaine carte: ${getQuickTargetLabel(nextTarget)}.` : "";
    setTableStatus(`${rank} ajoutee a ${getQuickTargetLabel(target)} et au compteur.${nextMessage}`);
    return;
  }

  state.quickTarget = "counter";
  addCards([{ rank, source: "manuel" }]);
}

function addCountEntry(rank, source = "manuel") {
  state.history.push({
    id: createId(),
    rank,
    delta: deltaForRank(rank),
    source,
    createdAt: new Date().toISOString(),
  });
}

function markTableCardCounted(rank) {
  state.table.countedCounts[rank] = (state.table.countedCounts[rank] || 0) + 1;
}

function decrementCountedTableCard(rank) {
  if (!RANKS.includes(rank) || !state.table.countedCounts[rank]) return;
  state.table.countedCounts[rank] -= 1;
  if (state.table.countedCounts[rank] <= 0) delete state.table.countedCounts[rank];
}

function removeCountedTableCard(rank) {
  if (!RANKS.includes(rank) || !state.table.countedCounts[rank]) return false;

  decrementCountedTableCard(rank);
  for (let index = state.history.length - 1; index >= 0; index -= 1) {
    const entry = state.history[index];
    if (entry.rank === rank && entry.source === "table") {
      state.history.splice(index, 1);
      return true;
    }
  }

  return true;
}

function addCards(cards) {
  const validCards = cards.filter((card) => RANKS.includes(card.rank));
  if (!validCards.length) return;

  validCards.forEach((card) => {
    addCountEntry(card.rank, card.source || "manuel");
  });

  saveState();
  renderApp();
}

function resetShoe() {
  state.history = [];
  state.table.countedCounts = {};
  saveState();
  renderApp();
}

function undoLastCard() {
  const entry = state.history.pop();
  if (entry?.source === "table") decrementCountedTableCard(entry.rank);
  saveState();
  renderApp();
}

function renderHistory() {
  elements.historyList.replaceChildren();

  const recent = [...state.history].reverse().slice(0, 50);
  if (!recent.length) {
    const item = document.createElement("li");
    item.className = "empty-state";
    item.textContent = "Aucune carte enregistree.";
    elements.historyList.appendChild(item);
    return;
  }

  recent.forEach((entry) => {
    const item = document.createElement("li");

    const rank = document.createElement("span");
    rank.className = "history-rank";
    rank.textContent = entry.rank;

    const source = document.createElement("span");
    source.className = "history-source";
    source.textContent = formatHistorySource(entry.source);

    const delta = document.createElement("span");
    delta.className = "history-delta";
    delta.textContent = signed(entry.delta);

    item.append(rank, source, delta);
    elements.historyList.appendChild(item);
  });
}

function formatHistorySource(source) {
  if (source === "photo") return "photo";
  if (source === "table") return "table";
  return "manuel";
}

function renderEdgeStatus(stats) {
  elements.edgeStatus.className = "status-box";

  const title = elements.edgeStatus.querySelector("strong");
  const detail = elements.edgeStatus.querySelector("small");

  if (stats.trueCount >= 4) {
    elements.edgeStatus.classList.add("hot");
    title.textContent = "Tres favorable";
    detail.textContent = "Le sabot est riche en cartes fortes.";
    return;
  }

  if (stats.trueCount >= 2) {
    elements.edgeStatus.classList.add("positive");
    title.textContent = "Favorable";
    detail.textContent = "Plus de 10, figures et As restent dans le sabot.";
    return;
  }

  if (stats.trueCount <= -1) {
    elements.edgeStatus.classList.add("negative");
    title.textContent = "Defavorable";
    detail.textContent = "Le sabot manque de cartes fortes.";
    return;
  }

  title.textContent = "Neutre";
  detail.textContent = stats.seen ? "Pas d'avantage net pour le moment." : "Le sabot vient de commencer.";
}

function getBetUnits(stats) {
  if (stats.trueCount < 1) return 1;
  return Math.min(8, Math.max(1, Math.floor(stats.trueCount)));
}

function getBetAmount(stats) {
  const baseBet = Math.max(1, Math.round(state.baseBet));
  return baseBet * getBetUnits(stats);
}

function getActionRecommendation(stats) {
  const betAmount = getBetAmount(stats);

  if (!stats.seen) {
    return {
      tone: "neutral",
      title: "Debut du sabot - mise de base",
      action: `Mise ${betAmount}. Commence a entrer les cartes vues.`,
      bet: "Mise de base",
      play: "Strategie normale",
      reason: "Aucune carte vue",
    };
  }

  if (stats.trueCount >= 4) {
    return {
      tone: "hot",
      title: "Tres favorable - augmenter fort",
      action: `Mise ${betAmount}. Le sabot contient beaucoup de cartes fortes.`,
      bet: "Augmenter fort",
      play: "Strategie normale",
      reason: `True count ${stats.trueCount.toFixed(1)}`,
    };
  }

  if (stats.trueCount >= 2) {
    return {
      tone: "positive",
      title: "Favorable - augmenter",
      action: `Mise ${betAmount}. Situation meilleure pour le joueur.`,
      bet: "Augmenter",
      play: "Strategie normale",
      reason: `True count ${stats.trueCount.toFixed(1)}`,
    };
  }

  if (stats.trueCount <= -1) {
    return {
      tone: "negative",
      title: "Defavorable - rester minimum",
      action: `Mise ${betAmount}. N'augmente pas la mise.`,
      bet: "Minimum",
      play: "Strategie normale",
      reason: `True count ${stats.trueCount.toFixed(1)}`,
    };
  }

  return {
    tone: "neutral",
    title: "Neutre - mise de base",
    action: `Mise ${betAmount}. Continue a compter.`,
    bet: "Mise de base",
    play: "Strategie normale",
    reason: `True count ${stats.trueCount.toFixed(1)}`,
  };
}

function renderBetSuggestion(stats) {
  elements.betSuggestion.textContent = `${getBetAmount(stats)}`;
}

function fillVpnCountrySelect() {
  elements.vpnCountrySelect.replaceChildren();
  VPN_COUNTRIES.forEach((country) => appendOption(elements.vpnCountrySelect, country.value, country.label));
}

function renderVpnControls() {
  const countryLabel = getVpnCountryLabel();
  elements.vpnBox.classList.toggle("active", state.vpn.enabled);
  elements.vpnCountrySelect.value = state.vpn.country;
  elements.vpnToggleButton.textContent = state.vpn.enabled ? "Desactiver le VPN" : "Activer le VPN";
  elements.vpnToggleButton.setAttribute("aria-pressed", `${state.vpn.enabled}`);
  elements.vpnState.textContent = state.vpn.enabled ? "Actif" : "Inactif";
  elements.vpnStatus.textContent = state.vpn.enabled
    ? `Profil VPN actif: ${countryLabel}.`
    : `VPN inactif. Pays pret: ${countryLabel}.`;
}

function setVpnCountry(value) {
  const country = getVpnCountry(value);
  if (!country) return;

  state.vpn.country = country.value;
  saveState();
  renderApp();
}

function toggleVpn() {
  state.vpn.enabled = !state.vpn.enabled;
  saveState();
  renderApp();
}

function renderRulesControls() {
  elements.dealerSoft17Rule.value = state.rules.dealerHitsSoft17 ? "hit" : "stand";
  elements.surrenderAllowed.checked = state.rules.surrenderAllowed;
  elements.doubleAfterSplitAllowed.checked = state.rules.doubleAfterSplitAllowed;
  elements.insuranceAllowed.checked = state.rules.insuranceAllowed;
  elements.splitAcesOneCard.checked = state.rules.splitAcesOneCard;
}

function updateRule(key, value) {
  state.rules[key] = value;
  saveState();
  renderApp();
}

function renderActionRecommendation(stats) {
  const recommendation = getActionRecommendation(stats);
  const activeHand = findActiveHand();
  const activeRecommendation = activeHand ? getRuleAdjustedRecommendation(activeHand.hand) : null;

  elements.resultPanel.className = `result-panel ${recommendation.tone}`;
  elements.resultTitle.textContent = recommendation.title;
  elements.resultAction.textContent = activeHand
    ? `${recommendation.action} Action: ${activeRecommendation.action} pour Joueur ${activeHand.player.number}, main ${activeHand.handIndex + 1}.`
    : recommendation.action;
  elements.resultBet.textContent = recommendation.bet;
  elements.resultPlay.textContent = activeHand
    ? `Joueur ${activeHand.player.number}: ${activeRecommendation.action}`
    : recommendation.play;
  elements.resultReason.textContent = activeRecommendation ? activeRecommendation.reason : recommendation.reason;
}

function cardValue(rank) {
  if (rank === "A") return 11;
  if (["10", "J", "Q", "K"].includes(rank)) return 10;
  return Number(rank);
}

function splitValue(rank) {
  return ["10", "J", "Q", "K"].includes(rank) ? "10" : rank;
}

function getHandInfo(cards) {
  let total = cards.reduce((sum, rank) => sum + cardValue(rank), 0);
  let aces = cards.filter((rank) => rank === "A").length;
  let soft = aces > 0;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  soft = aces > 0;

  return {
    total,
    soft,
    bust: total > 21,
    blackjack: cards.length === 2 && total === 21,
    pair: cards.length === 2 && splitValue(cards[0]) === splitValue(cards[1]),
  };
}

function formatHandSummary(cards) {
  if (!cards.length) return "Aucune carte";

  const info = getHandInfo(cards);
  if (info.blackjack) return "Blackjack 21";
  if (info.bust) return `${info.total} - saute`;
  return `${info.soft ? "Soft " : ""}${info.total}`;
}

function getDealerDecision() {
  const cards = state.table.dealerCards;
  if (!cards.length) {
    return recommendation("neutral", "Entrer cartes", "Ajoute la carte visible du croupier.", "setup");
  }

  const info = getHandInfo(cards);
  if (info.blackjack) return recommendation("hot", "Blackjack", "Le croupier a un blackjack naturel.", "done");
  if (info.bust) return recommendation("negative", "Saute", "Le croupier depasse 21.", "done");
  if (info.total < 17) return recommendation("neutral", "Tirer", "Le croupier doit tirer jusqu'a 17.", "dealer-hit");
  if (info.total > 17) return recommendation("positive", "Rester", "Le croupier reste au-dessus de 17.", "dealer-stand");
  if (info.soft && state.rules.dealerHitsSoft17) {
    return recommendation("neutral", "Tirer soft 17", "Regle H17: le croupier tire sur A+6.", "dealer-hit");
  }
  if (info.soft) {
    return recommendation("positive", "Rester soft 17", "Regle S17: le croupier reste sur A+6.", "dealer-stand");
  }

  return recommendation("positive", "Rester 17", "Le croupier reste sur 17 dur.", "dealer-stand");
}

function hasLivePlayerHands() {
  return state.table.players.some((player) =>
    player.hands.some((hand) => {
      const info = getHandInfo(hand.cards);
      return hand.cards.length >= 2 && hand.status !== "surrender" && !info.bust;
    })
  );
}

function getHandOutcome(hand) {
  const dealerDecision = getDealerDecision();
  const dealerInfo = getHandInfo(state.table.dealerCards);
  const playerInfo = getHandInfo(hand.cards);

  if (hand.status === "surrender") return "Perdu 1/2 mise - abandon.";
  if (playerInfo.bust) return "Perdu - joueur saute.";
  if (hand.cards.length < 2) return "";
  if (!["dealer-stand", "done"].includes(dealerDecision.code) && hasLivePlayerHands()) return "";
  if (dealerInfo.blackjack) return playerInfo.blackjack ? "Push - deux blackjacks." : "Perdu - blackjack croupier.";
  if (playerInfo.blackjack) return "Gagne - blackjack joueur.";
  if (dealerInfo.bust) return "Gagne - croupier saute.";
  if (!state.table.dealerCards.length) return "";
  if (playerInfo.total > dealerInfo.total) return "Gagne - main plus forte.";
  if (playerInfo.total < dealerInfo.total) return "Perdu - croupier plus fort.";
  return "Push - egalite.";
}

function getDealerUpValue() {
  const rank = state.table.dealerCards[0];
  if (!rank) return null;
  return cardValue(rank);
}

function getHandRecommendation(hand) {
  const cards = hand.cards;
  const info = getHandInfo(cards);
  const dealer = getDealerUpValue();

  if (!cards.length) return recommendation("neutral", "Entrer cartes", "Ajoute les cartes de la main.", "setup");
  if (cards.length === 1) return recommendation("neutral", "Deuxieme carte", "Ajoute la deuxieme carte avant de decider.", "setup");
  if (!dealer) return recommendation("neutral", "Carte croupier", "Ajoute la carte visible du croupier.", "setup");
  if (hand.pendingAction === "hit") {
    return recommendation("neutral", "Carte tiree", "Clique la carte sortie dans la grille du bas.", "setup");
  }
  if (hand.pendingAction === "double") {
    return recommendation("hot", "Carte double", "Clique la carte sortie dans la grille du bas.", "setup");
  }
  if (hand.status === "surrender") return recommendation("negative", "Abandon", "Main abandonnee.", "done");
  if (hand.status === "stand") return recommendation("neutral", "Reste", "Main terminee.", "done");
  if (hand.status === "double") return recommendation("hot", "Double fait", "Main terminee apres une carte.", "done");
  if (state.rules.splitAcesOneCard && hand.splitAces && cards.length >= 2) {
    return recommendation("positive", "Rester", "As splittes: une seule carte par main.", "done");
  }
  if (info.blackjack) return recommendation("hot", "Blackjack", "Ne tire pas.", "done");
  if (info.bust) return recommendation("negative", "Saute", "Main perdue.", "done");

  if (info.pair) {
    const pairRank = splitValue(cards[0]);
    const pairMove = pairRecommendation(pairRank, dealer);
    if (pairMove) return pairMove;
  }

  if (info.soft) return softRecommendation(info.total, dealer);
  return hardRecommendation(info.total, dealer);
}

function getRuleAdjustedRecommendation(hand) {
  const base = getHandRecommendation(hand);
  const allowed = getAllowedActions(hand);

  if (!base.code || ["setup", "done"].includes(base.code) || allowed.includes(base.code)) return base;

  const info = getHandInfo(hand.cards);

  if (base.code === "double") {
    if (info.soft && info.total >= 18) {
      return recommendation("positive", "Rester", `${base.reason} Double non autorise ici, donc rester.`, "stand");
    }
    return recommendation("neutral", "Tirer", `${base.reason} Double non autorise ici, donc tirer.`, "hit");
  }

  if (base.code === "surrender") {
    if (info.total >= 17) {
      return recommendation("positive", "Rester", `${base.reason} Abandon non autorise ici, donc rester.`, "stand");
    }
    return recommendation("neutral", "Tirer", `${base.reason} Abandon non autorise ici, donc tirer.`, "hit");
  }

  return base;
}

function recommendation(tone, action, reason, code) {
  return { tone, action, reason, code };
}

function pairRecommendation(pairRank, dealer) {
  if (pairRank === "A") return recommendation("hot", "Split", "Toujours separer les As.", "split");
  if (pairRank === "8") {
    if (dealer === 11 && state.rules.dealerHitsSoft17 && state.rules.surrenderAllowed) {
      return recommendation("negative", "Abandon", "H17: 8-8 contre As peut s'abandonner si autorise.", "surrender");
    }
    return recommendation("hot", "Split", "Toujours separer les 8.", "split");
  }
  if (pairRank === "10") return recommendation("positive", "Rester", "Ne split pas les 10/figures.", "stand");
  if (pairRank === "9") {
    return [2, 3, 4, 5, 6, 8, 9].includes(dealer)
      ? recommendation("hot", "Split", "9-9 se split contre 2-6, 8, 9.", "split")
      : recommendation("positive", "Rester", "9-9 reste contre 7, 10, As.", "stand");
  }
  if (pairRank === "7") {
    return dealer <= 7
      ? recommendation("hot", "Split", "7-7 se split contre 2-7.", "split")
      : recommendation("neutral", "Tirer", "Contre 8 ou plus, joue comme 14.", "hit");
  }
  if (pairRank === "6") {
    return dealer >= 2 && dealer <= 6
      ? recommendation("hot", "Split", "6-6 se split contre 2-6.", "split")
      : recommendation("neutral", "Tirer", "Contre 7 ou plus, tire.", "hit");
  }
  if (pairRank === "5") return hardRecommendation(10, dealer);
  if (pairRank === "4") {
    return dealer === 5 || dealer === 6
      ? recommendation("hot", "Split", "4-4 se split seulement contre 5-6.", "split")
      : recommendation("neutral", "Tirer", "4-4 se joue comme 8.", "hit");
  }
  if (pairRank === "3" || pairRank === "2") {
    return dealer >= 2 && dealer <= 7
      ? recommendation("hot", "Split", `${pairRank}-${pairRank} se split contre 2-7.`, "split")
      : recommendation("neutral", "Tirer", "Contre 8 ou plus, tire.", "hit");
  }

  return null;
}

function softRecommendation(total, dealer) {
  if (total >= 20) return recommendation("positive", "Rester", "Soft 20+ reste.", "stand");
  if (total === 19) {
    if (state.rules.dealerHitsSoft17 && dealer === 6) {
      return recommendation("hot", "Doubler", "H17: soft 19 double contre 6.", "double");
    }
    return recommendation("positive", "Rester", "Soft 19 reste.", "stand");
  }
  if (total === 18) {
    if (state.rules.dealerHitsSoft17 && dealer === 2) {
      return recommendation("hot", "Doubler", "H17: soft 18 double contre 2.", "double");
    }
    if (dealer >= 3 && dealer <= 6) return recommendation("hot", "Doubler", "Soft 18 double contre 3-6.", "double");
    if ([2, 7, 8].includes(dealer)) return recommendation("positive", "Rester", "Soft 18 reste contre 2, 7, 8.", "stand");
    return recommendation("neutral", "Tirer", "Soft 18 tire contre 9, 10, As.", "hit");
  }
  if (total === 17) {
    return dealer >= 3 && dealer <= 6
      ? recommendation("hot", "Doubler", "Soft 17 double contre 3-6.", "double")
      : recommendation("neutral", "Tirer", "Soft 17 tire sinon.", "hit");
  }
  if (total === 15 || total === 16) {
    return dealer >= 4 && dealer <= 6
      ? recommendation("hot", "Doubler", "Soft 15/16 double contre 4-6.", "double")
      : recommendation("neutral", "Tirer", "Soft 15/16 tire sinon.", "hit");
  }
  if (total === 13 || total === 14) {
    return dealer >= 5 && dealer <= 6
      ? recommendation("hot", "Doubler", "Soft 13/14 double contre 5-6.", "double")
      : recommendation("neutral", "Tirer", "Soft 13/14 tire sinon.", "hit");
  }

  return recommendation("neutral", "Tirer", "Main soft faible.", "hit");
}

function hardRecommendation(total, dealer) {
  if (total === 17 && dealer === 11 && state.rules.dealerHitsSoft17 && state.rules.surrenderAllowed) {
    return recommendation("negative", "Abandon", "H17: 17 contre As peut s'abandonner si autorise.", "surrender");
  }
  if (total >= 17) return recommendation("positive", "Rester", "17 ou plus reste.", "stand");
  if (total >= 13 && total <= 16) {
    if (dealer >= 2 && dealer <= 6) return recommendation("positive", "Rester", "Le croupier est faible.", "stand");
    if (state.rules.surrenderAllowed && total === 16 && dealer >= 9) {
      return recommendation("negative", "Abandon", "16 contre 9/10/As: abandon si autorise.", "surrender");
    }
    if (state.rules.surrenderAllowed && total === 15 && (dealer === 10 || (dealer === 11 && state.rules.dealerHitsSoft17))) {
      return recommendation("negative", "Abandon", "15 contre 10/As: abandon si autorise.", "surrender");
    }
    return recommendation("neutral", "Tirer", "Le croupier est fort.", "hit");
  }
  if (total === 12) {
    return dealer >= 4 && dealer <= 6
      ? recommendation("positive", "Rester", "12 reste contre 4-6.", "stand")
      : recommendation("neutral", "Tirer", "12 tire contre 2-3 et 7+.", "hit");
  }
  if (total === 11) {
    if (!state.rules.dealerHitsSoft17 && dealer === 11) {
      return recommendation("neutral", "Tirer", "S17: 11 tire contre As.", "hit");
    }
    return recommendation("hot", "Doubler", "11 double contre cette carte visible.", "double");
  }
  if (total === 10) {
    return dealer >= 2 && dealer <= 9
      ? recommendation("hot", "Doubler", "10 double contre 2-9.", "double")
      : recommendation("neutral", "Tirer", "10 tire contre 10 ou As.", "hit");
  }
  if (total === 9) {
    return dealer >= 3 && dealer <= 6
      ? recommendation("hot", "Doubler", "9 double contre 3-6.", "double")
      : recommendation("neutral", "Tirer", "9 tire sinon.", "hit");
  }

  return recommendation("neutral", "Tirer", "8 ou moins tire.", "hit");
}

function getAllowedActions(hand) {
  const info = getHandInfo(hand.cards);
  if (hand.pendingAction) return [];
  if (!getDealerUpValue() || hand.cards.length < 2 || hand.status !== "playing" || info.bust || info.blackjack) return [];
  if (state.rules.splitAcesOneCard && hand.splitAces && hand.cards.length >= 2) return [];

  const actions = ["hit", "stand"];
  if (hand.cards.length === 2) {
    if (!hand.fromSplit || state.rules.doubleAfterSplitAllowed) actions.push("double");
    if (state.rules.surrenderAllowed && !hand.fromSplit) actions.push("surrender");
    if (info.pair) actions.push("split");
    if (state.rules.insuranceAllowed && state.table.dealerCards[0] === "A" && !hand.actionLog.includes("Assurance")) {
      actions.push("insurance");
    }
  }

  return actions;
}

function actionLabel(action) {
  return {
    hit: "Tirer",
    stand: "Rester",
    double: "Doubler",
    split: "Split",
    surrender: "Abandon",
    insurance: "Assurance",
  }[action] || action;
}

function getAllTableCards() {
  const playerCards = state.table.players.flatMap((player) => player.hands.flatMap((hand) => hand.cards));
  return [...state.table.dealerCards, ...playerCards];
}

function getRankCounts(cards) {
  return cards.reduce((counts, rank) => {
    counts[rank] = (counts[rank] || 0) + 1;
    return counts;
  }, {});
}

function getCardsCountDelta(cards) {
  return cards.reduce((total, rank) => total + deltaForRank(rank), 0);
}

function countVisibleTableCards() {
  const counts = getRankCounts(getAllTableCards());
  const toAdd = [];

  RANKS.forEach((rank) => {
    const current = counts[rank] || 0;
    const alreadyCounted = state.table.countedCounts[rank] || 0;
    const missing = Math.max(0, current - alreadyCounted);
    for (let i = 0; i < missing; i += 1) {
      toAdd.push({ rank, source: "table" });
    }
    state.table.countedCounts[rank] = Math.max(alreadyCounted, current);
  });

  if (!toAdd.length) {
    setTableStatus("Aucune nouvelle carte visible a compter.");
    renderApp();
    return;
  }

  addCards(toAdd);
  setTableStatus(`${toAdd.length} carte(s) visible(s) ajoutee(s) au compteur.`);
}

function hasUncountedVisibleCards() {
  const counts = getRankCounts(getAllTableCards());
  return RANKS.some((rank) => (counts[rank] || 0) > (state.table.countedCounts[rank] || 0));
}

function setTableStatus(message) {
  elements.tableStatus.textContent = message;
}

function targetForPlayerHand(playerIndex, handIndex) {
  return `player:${playerIndex}:${handIndex}`;
}

function parsePlayerQuickTarget(target) {
  const match = /^player:(\d+):(\d+)$/.exec(target);
  if (!match) return null;

  const playerIndex = Number(match[1]);
  const handIndex = Number(match[2]);
  if (!state.table.players[playerIndex]?.hands[handIndex]) return null;

  return { playerIndex, handIndex };
}

function getQuickTargets() {
  const targets = [
    { value: "counter", label: "Compteur seul" },
    { value: "dealer", label: "Croupier" },
  ];

  state.table.players.forEach((player, playerIndex) => {
    player.hands.forEach((hand, handIndex) => {
      const label =
        player.hands.length === 1
          ? `Joueur ${player.number}`
          : `Joueur ${player.number} - main ${handIndex + 1}`;
      targets.push({ value: targetForPlayerHand(playerIndex, handIndex), label });
    });
  });

  return targets;
}

function getActiveQuickTarget() {
  return getQuickTargets().some((target) => target.value === state.quickTarget) ? state.quickTarget : "counter";
}

function getQuickTargetLabel(target = getActiveQuickTarget()) {
  return getQuickTargets().find((option) => option.value === target)?.label || "Compteur seul";
}

function findNextSplitHandNeedingCard(playerIndex, currentHandIndex) {
  const player = state.table.players[playerIndex];
  if (!player) return null;

  const needsCard = (hand) => hand.fromSplit && hand.status === "playing" && hand.cards.length === 1;
  const indexes = [
    ...player.hands.map((_, index) => index).filter((index) => index > currentHandIndex),
    ...player.hands.map((_, index) => index).filter((index) => index < currentHandIndex),
  ];
  const nextIndex = indexes.find((index) => needsCard(player.hands[index]));

  return Number.isInteger(nextIndex) ? targetForPlayerHand(playerIndex, nextIndex) : null;
}

function renderQuickTargetControls() {
  const activeTarget = getActiveQuickTarget();
  elements.quickTargetSelect.replaceChildren();
  getQuickTargets().forEach((target) => appendOption(elements.quickTargetSelect, target.value, target.label));
  elements.quickTargetSelect.value = activeTarget;

  if (activeTarget === "counter") {
    elements.quickTargetStatus.textContent = "Compteur seul: les cartes du bas ajoutent seulement au running count.";
    return;
  }

  elements.quickTargetStatus.textContent = `${getQuickTargetLabel(activeTarget)} selectionne: les cartes du bas ajoutent a cette main et au compteur.`;
}

function setQuickTarget(target) {
  state.quickTarget = getQuickTargets().some((option) => option.value === target) ? target : "counter";
  saveState();
  renderApp();

  if (state.quickTarget === "counter") {
    setTableStatus("Destination: compteur seul. Les cartes du bas ne remplissent pas la table.");
    return;
  }

  setTableStatus(`Destination active: ${getQuickTargetLabel()}. Clique ensuite les cartes du bas.`);
}

function hasAnyTableCards() {
  return getAllTableCards().length > 0;
}

function shouldArchiveCurrentRound() {
  return state.table.roundStarted || hasAnyTableCards();
}

function createArchivedRound() {
  const cards = getAllTableCards();
  const players = state.table.players.map((player) => ({
    number: player.number,
    hands: player.hands.map((hand) => ({
      cards: [...hand.cards],
      betAmount: hand.betAmount,
      betMultiplier: hand.betMultiplier,
      status: hand.status,
      outcome: getHandOutcome(hand),
    })),
  }));

  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    dealerCards: [...state.table.dealerCards],
    players,
    cards,
    cardCount: cards.length,
    countDelta: getCardsCountDelta(cards),
    totalBet: getRoundBetTotal(),
  };
}

function archiveCurrentRound() {
  if (!shouldArchiveCurrentRound()) return false;

  const archive = createArchivedRound();
  if (!archive.cardCount) return false;

  state.roundHistory.unshift(archive);
  state.roundHistory = state.roundHistory.slice(0, 100);
  return true;
}

function getMemoryCards() {
  return [...state.roundHistory.flatMap((round) => round.cards), ...getAllTableCards()];
}

function clearRoundMemory() {
  state.roundHistory = [];
  setTableStatus("Memoire des parties videe.");
  saveState();
  renderApp();
}

function isBettingLocked() {
  return state.table.roundStarted || hasAnyTableCards();
}

function getRoundBetTotal() {
  return state.table.players.reduce(
    (total, player) => total + player.hands.reduce((sum, hand) => sum + hand.betAmount * hand.betMultiplier, 0),
    0
  );
}

function pushBetSnapshot() {
  state.table.betHistory.push({
    roundBet: state.table.roundBet,
    playerBets: state.table.players.map((player) => player.hands.map((hand) => hand.betAmount)),
  });
  state.table.betHistory = state.table.betHistory.slice(-10);
}

function applyRoundBet(amount) {
  const nextAmount = Math.max(0, Math.round(Number(amount) || 0));
  state.table.roundBet = nextAmount;
  state.table.players.forEach((player) => {
    player.hands.forEach((hand) => {
      if (!hand.fromSplit) hand.betAmount = nextAmount;
    });
  });
}

function restoreBetSnapshot(snapshot) {
  if (!snapshot) return;

  state.table.roundBet = snapshot.roundBet;
  state.table.players.forEach((player, playerIndex) => {
    player.hands.forEach((hand, handIndex) => {
      const restored = snapshot.playerBets[playerIndex]?.[handIndex];
      hand.betAmount = Number.isFinite(restored) ? restored : snapshot.roundBet;
    });
  });
}

function dealRound() {
  if (state.table.roundBet <= 0 || getRoundBetTotal() <= 0) {
    setTableStatus("Place une mise avant de distribuer.");
    return;
  }

  state.table.roundStarted = true;
  setTableStatus("Cartes distribuees. Entre maintenant les cartes du croupier et des joueurs.");
  saveState();
  renderApp();
}

function doubleTableBets() {
  if (isBettingLocked()) {
    setTableStatus("Les mises de depart sont verrouillees apres DISTRIBUER.");
    return;
  }

  if (state.table.roundBet <= 0) {
    setTableStatus("Aucune mise a doubler.");
    return;
  }

  pushBetSnapshot();
  applyRoundBet(state.table.roundBet * 2);
  setTableStatus("Toutes les mises de depart ont ete doublees.");
  saveState();
  renderApp();
}

function clearTableBets() {
  if (isBettingLocked()) {
    setTableStatus("Impossible de retirer les mises apres distribution.");
    return;
  }

  pushBetSnapshot();
  applyRoundBet(0);
  setTableStatus("Toutes les mises ont ete retirees.");
  saveState();
  renderApp();
}

function undoTableBet() {
  if (isBettingLocked()) {
    setTableStatus("Retour mise disponible seulement avant distribution.");
    return;
  }

  const snapshot = state.table.betHistory.pop();
  if (!snapshot) {
    setTableStatus("Aucune mise precedente a restaurer.");
    return;
  }

  restoreBetSnapshot(snapshot);
  setTableStatus("Derniere action de mise annulee.");
  saveState();
  renderApp();
}

function setPlayerCount(count) {
  const nextCount = clamp(Math.round(Number(count) || 1), 1, 7);
  const currentPlayers = state.table.players;
  state.table.playerCount = nextCount;
  state.table.players = Array.from({ length: nextCount }, (_, index) => {
    const existing = currentPlayers[index];
    if (existing) {
      existing.number = index + 1;
      if (!existing.hands.length) existing.hands = [createHand()];
      return existing;
    }
    const player = createPlayer(index + 1);
    player.hands.forEach((hand) => {
      hand.betAmount = state.table.roundBet;
    });
    return player;
  });
  saveState();
  renderApp();
}

function clearTable() {
  const archived = archiveCurrentRound();
  state.table = createDefaultTable(state.table.playerCount || 1);
  applyRoundBet(Math.max(1, Math.round(Number(state.baseBet) || 10)));
  setTableStatus(archived ? "Manche memorisee. Nouvelle manche prete." : "Nouvelle manche prete. Entre les cartes visibles.");
  saveState();
  renderApp();
}

function addDealerCard() {
  const rank = elements.dealerCardSelect.value;
  if (!RANKS.includes(rank)) {
    setTableStatus("Choisis une carte croupier a ajouter.");
    return false;
  }

  return addRankToDealer(rank);
}

function addRankToDealer(rank, options = {}) {
  if (!RANKS.includes(rank)) {
    setTableStatus("Choisis une carte croupier a ajouter.");
    return false;
  }

  const decision = getDealerDecision();
  if (state.table.dealerCards.length >= 2 && decision.code !== "dealer-hit") {
    setTableStatus(`Le croupier ne doit plus tirer: ${decision.reason}`);
    return false;
  }

  state.table.roundStarted = true;
  state.table.dealerCards.push(rank);
  if (options.countIt) {
    markTableCardCounted(rank);
    addCountEntry(rank, "table");
  }
  saveState();
  renderApp();
  return true;
}

function removeDealerCard(index) {
  const [rank] = state.table.dealerCards.splice(index, 1);
  removeCountedTableCard(rank);
  saveState();
  renderApp();
}

function clearDealerCards() {
  state.table.dealerCards.forEach(removeCountedTableCard);
  state.table.dealerCards = [];
  saveState();
  renderApp();
}

function addRankToPlayerHand(playerIndex, handIndex, rank, options = {}) {
  const player = state.table.players[playerIndex];
  const hand = player?.hands[handIndex];
  if (!hand || !RANKS.includes(rank)) {
    setTableStatus("Choisis la main et la carte a ajouter.");
    return false;
  }
  if (hand.status !== "playing" && !hand.pendingAction) {
    setTableStatus("Cette main est terminee. Supprime une carte ou vide la main avant d'en ajouter une.");
    return false;
  }

  state.table.roundStarted = true;
  hand.cards.push(rank);
  const pendingAction = hand.pendingAction;
  if (pendingAction === "hit") {
    hand.actionLog.push(`Tire ${rank}`);
  } else if (pendingAction === "double") {
    hand.actionLog.push(`Carte double ${rank}`);
    hand.status = "double";
  } else {
    hand.actionLog.push(`Carte ${rank}`);
  }
  hand.pendingAction = "";

  if (state.rules.splitAcesOneCard && hand.splitAces && hand.cards.length >= 2) {
    hand.status = "stand";
    hand.actionLog.push("As split: une carte");
  }

  const info = getHandInfo(hand.cards);
  if (info.bust) hand.status = "bust";
  if (info.blackjack) hand.status = "blackjack";

  const nextSplitTarget = findNextSplitHandNeedingCard(playerIndex, handIndex);
  if (nextSplitTarget) state.quickTarget = nextSplitTarget;

  if (options.countIt) {
    markTableCardCounted(rank);
    addCountEntry(rank, "table");
  }

  saveState();
  renderApp();
  return true;
}

function removePlayerCard(playerIndex, handIndex, cardIndex) {
  const [rank] = state.table.players[playerIndex].hands[handIndex].cards.splice(cardIndex, 1);
  removeCountedTableCard(rank);
  saveState();
  renderApp();
}

function clearPlayerHand(playerIndex, handIndex) {
  const current = state.table.players[playerIndex].hands[handIndex];
  current.cards.forEach(removeCountedTableCard);
  state.table.players[playerIndex].hands[handIndex] = createHand([], { betAmount: current.betAmount });
  saveState();
  renderApp();
}

function applyHandAction(playerIndex, handIndex, action) {
  const hand = state.table.players[playerIndex].hands[handIndex];
  const allowed = getAllowedActions(hand);
  if (!allowed.includes(action)) return;

  if (action === "stand") {
    hand.status = "stand";
    hand.actionLog.push("Reste");
    saveState();
    renderApp();
    return;
  }

  if (action === "surrender") {
    hand.status = "surrender";
    hand.betMultiplier = 0.5;
    hand.actionLog.push("Abandon");
    saveState();
    renderApp();
    return;
  }

  if (action === "insurance") {
    hand.actionLog.push("Assurance");
    setTableStatus("Assurance notee. Continue ensuite la decision normale de la main.");
    saveState();
    renderApp();
    return;
  }

  if (action === "split") {
    splitHand(playerIndex, handIndex);
    return;
  }

  if (action === "double") {
    hand.betMultiplier = 2;
    hand.pendingAction = "double";
    hand.actionLog.push("Double");
  } else {
    hand.pendingAction = "hit";
    hand.actionLog.push("Tirer");
  }

  state.quickTarget = targetForPlayerHand(playerIndex, handIndex);
  saveState();
  renderApp();
  setTableStatus(`${actionLabel(action)}: clique la carte sortie dans la grille du bas pour ${getQuickTargetLabel()}.`);
}

function splitHand(playerIndex, handIndex) {
  const player = state.table.players[playerIndex];
  const hand = player.hands[handIndex];
  if (!getAllowedActions(hand).includes("split")) return;

  const [first, second] = hand.cards;
  const splitAces = first === "A" && second === "A";
  const firstHand = createHand([first], { fromSplit: true, splitAces, betAmount: hand.betAmount });
  const secondHand = createHand([second], { fromSplit: true, splitAces, betAmount: hand.betAmount });
  firstHand.actionLog.push("Split");
  secondHand.actionLog.push("Split");
  player.hands.splice(handIndex, 1, firstHand, secondHand);
  state.quickTarget = targetForPlayerHand(playerIndex, handIndex);

  saveState();
  renderApp();
  setTableStatus(
    `Split fait: ajoute une carte a ${getQuickTargetLabel()}, puis l'app passera a l'autre main.`
  );
}

function renderTable() {
  elements.playerCount.value = `${state.table.playerCount}`;
  elements.dealerSummary.textContent = formatHandSummary(state.table.dealerCards);
  const dealerDecision = getDealerDecision();
  elements.dealerRecommendation.className = `recommendation ${dealerDecision.tone}`;
  elements.dealerRecommendation.querySelector("strong").textContent = dealerDecision.action;
  elements.dealerRecommendation.querySelector("span").textContent = "Regle croupier";
  elements.countTableButton.disabled = !hasUncountedVisibleCards();
  const dealerSelected = getActiveQuickTarget() === "dealer";
  elements.dealerHand.classList.toggle("selected-hand", dealerSelected);
  elements.selectDealerButton.classList.toggle("selected", dealerSelected);
  elements.selectDealerButton.textContent = dealerSelected ? "Selectionne" : "Selectionner";
  elements.selectDealerButton.setAttribute("aria-pressed", `${dealerSelected}`);

  renderBettingPanel();
  renderRoundSteps();
  renderCardChips(elements.dealerCards, state.table.dealerCards, removeDealerCard);
  renderPlayers();
  renderRoundMemory();
}

function renderBettingPanel() {
  if (!elements.roundBetSummary) return;

  const locked = isBettingLocked();
  const total = getRoundBetTotal();

  elements.roundBetSummary.textContent =
    state.table.roundBet > 0 ? `Mise par main: ${state.table.roundBet}` : "Aucune mise placee";
  elements.roundBetDetail.textContent = `Total table: ${total}`;
  elements.dealButton.disabled = locked || total <= 0;
  elements.doubleBetsButton.disabled = locked || state.table.roundBet <= 0;
  elements.clearBetsButton.disabled = locked || total <= 0;
  elements.undoBetButton.disabled = locked || state.table.betHistory.length === 0;
}

function renderRoundMemory() {
  const memoryCards = getMemoryCards();
  const counts = getRankCounts(memoryCards);
  const currentCards = getAllTableCards().length;
  const countDelta = getCardsCountDelta(memoryCards);

  elements.memorySummary.textContent =
    state.roundHistory.length || currentCards
      ? `${state.roundHistory.length} partie(s) memorisee(s), ${memoryCards.length} carte(s) passees, Hi-Lo cumule ${signed(countDelta)}.`
      : "Aucune partie memorisee.";

  elements.passedCardsSummary.replaceChildren();
  RANKS.forEach((rank) => {
    const item = document.createElement("div");
    item.className = "passed-rank";

    const label = document.createElement("strong");
    label.textContent = rank;

    const value = document.createElement("span");
    value.textContent = `${counts[rank] || 0}`;

    item.append(label, value);
    elements.passedCardsSummary.appendChild(item);
  });

  elements.roundMemoryList.replaceChildren();
  if (!state.roundHistory.length) {
    const empty = document.createElement("li");
    empty.className = "round-memory-item";
    empty.textContent = currentCards
      ? "La manche en cours apparait deja dans les cartes passees. Clique Nouvelle manche pour l'archiver."
      : "Aucune manche archivee pour le moment.";
    elements.roundMemoryList.appendChild(empty);
    return;
  }

  state.roundHistory.slice(0, 12).forEach((round, index) => {
    const item = document.createElement("li");
    item.className = "round-memory-item";

    const title = document.createElement("strong");
    title.textContent = `Partie ${state.roundHistory.length - index} - ${formatDateTime(round.createdAt)}`;

    const dealer = document.createElement("span");
    dealer.textContent = `Croupier: ${formatCards(round.dealerCards)}`;

    const players = document.createElement("span");
    players.textContent = round.players
      .map((player) => `J${player.number}: ${player.hands.map((hand) => formatCards(hand.cards)).join(" / ")}`)
      .join(" | ");

    const meta = document.createElement("span");
    meta.textContent = `${round.cardCount} carte(s), Hi-Lo ${signed(round.countDelta)}, mise totale ${round.totalBet}`;

    item.append(title, dealer, players, meta);
    elements.roundMemoryList.appendChild(item);
  });
}

function formatCards(cards) {
  return cards && cards.length ? cards.join(" ") : "aucune";
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "date inconnue";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderRoundSteps() {
  const hasDealer = Boolean(state.table.dealerCards[0]);
  const allInitialHandsReady = state.table.players.every((player) =>
    player.hands.every((hand) => hand.cards.length >= 2 || hand.status !== "playing")
  );
  const activeHand = findActiveHand();
  const allHandsDone = !activeHand && allInitialHandsReady;
  const dealerDecision = getDealerDecision();
  const noLiveHands = allHandsDone && !hasLivePlayerHands();
  const dealerMustDraw = allHandsDone && !noLiveHands && dealerDecision.code === "dealer-hit";
  const dealerDone = allHandsDone && (noLiveHands || ["dealer-stand", "done"].includes(dealerDecision.code));

  const steps = [
    { text: "Entrer la carte visible du croupier.", done: hasDealer, active: !hasDealer },
    { text: "Entrer les cartes de chaque joueur.", done: allInitialHandsReady, active: hasDealer && !allInitialHandsReady },
    {
      text: activeHand
        ? `Jouer Joueur ${activeHand.player.number}, main ${activeHand.handIndex + 1}.`
        : "Choisir tirer / rester / doubler / split / abandon.",
      done: allHandsDone,
      active: hasDealer && allInitialHandsReady && Boolean(activeHand),
    },
    {
      text: dealerMustDraw
        ? `Croupier: ${dealerDecision.action}. Ajoute la carte sortie.`
        : "Entrer les cartes finales du croupier puis compter les visibles.",
      done: dealerDone || noLiveHands,
      active: allHandsDone && !dealerDone && !noLiveHands,
    },
  ];

  elements.roundSteps.replaceChildren();
  steps.forEach((step) => {
    const item = document.createElement("li");
    item.className = `${step.done ? "done" : ""} ${step.active ? "active" : ""}`.trim();
    item.textContent = step.text;
    elements.roundSteps.appendChild(item);
  });
}

function findActiveHand() {
  if (!getDealerUpValue()) return null;

  for (const player of state.table.players) {
    for (let handIndex = 0; handIndex < player.hands.length; handIndex += 1) {
      const hand = player.hands[handIndex];
      const info = getHandInfo(hand.cards);
      if (hand.status === "playing" && hand.cards.length >= 2 && !info.bust && !info.blackjack) {
        return { player, hand, handIndex };
      }
    }
  }

  return null;
}

function renderCardChips(container, cards, onRemove, options = {}) {
  container.replaceChildren();

  if (!cards.length) {
    if (options.showEmpty === false) return;

    const empty = document.createElement("span");
    empty.className = "empty-cards";
    empty.textContent = "Aucune carte";
    container.appendChild(empty);
    return;
  }

  cards.forEach((rank, index) => {
    const chip = document.createElement("span");
    chip.className = "card-chip";
    chip.textContent = rank;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "x";
    remove.setAttribute("aria-label", `Supprimer ${rank}`);
    remove.addEventListener("click", () => onRemove(index));

    chip.appendChild(remove);
    container.appendChild(chip);
  });
}

function renderPlayers() {
  elements.playersContainer.replaceChildren();
  const activeTarget = getActiveQuickTarget();

  state.table.players.forEach((player, playerIndex) => {
    player.hands.forEach((hand, handIndex) => {
      const handTarget = targetForPlayerHand(playerIndex, handIndex);
      const handSelected = activeTarget === handTarget;
      const handCard = document.createElement("article");
      handCard.className = `hand-card player-hand ${handSelected ? "selected-hand" : ""}`.trim();

      const recommendationInfo = getRuleAdjustedRecommendation(hand);
      const header = document.createElement("div");
      header.className = "hand-header";

      const titleWrap = document.createElement("div");
      const label = document.createElement("span");
      label.textContent =
        player.hands.length === 1 ? `Joueur ${player.number}` : `Joueur ${player.number} - main ${handIndex + 1}`;
      titleWrap.append(label);

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = `button secondary mini select-hand-button ${handSelected ? "selected" : ""}`.trim();
      selectButton.textContent = handSelected ? "Selectionne" : "Selectionner";
      selectButton.setAttribute("aria-pressed", `${handSelected}`);
      selectButton.addEventListener("click", () => setQuickTarget(handTarget));

      const clearButton = document.createElement("button");
      clearButton.type = "button";
      clearButton.className = "button secondary mini";
      clearButton.textContent = "Vider";
      clearButton.addEventListener("click", () => clearPlayerHand(playerIndex, handIndex));

      const handControls = document.createElement("div");
      handControls.className = "hand-controls";
      handControls.append(selectButton, clearButton);

      const recommendationBox = document.createElement("div");
      recommendationBox.className = `recommendation ${recommendationInfo.tone}`;
      const recommendationLabel = document.createElement("span");
      recommendationLabel.textContent = "Conseil";
      const recommendationAction = document.createElement("strong");
      recommendationAction.textContent = recommendationInfo.action;
      recommendationBox.append(recommendationLabel, recommendationAction);

      header.append(titleWrap, handControls, recommendationBox);

      const chips = document.createElement("div");
      chips.className = "card-chip-row";
      renderCardChips(chips, hand.cards, (cardIndex) => removePlayerCard(playerIndex, handIndex, cardIndex), {
        showEmpty: false,
      });

      const choices = document.createElement("div");
      choices.className = "choice-row";
      getAllowedActions(hand).forEach((action) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `button secondary ${recommendationInfo.code === action ? "recommended-choice" : ""} ${
          action === "surrender" || action === "insurance" ? "warning-choice" : ""
        }`.trim();
        button.textContent = actionLabel(action);
        button.addEventListener("click", () => applyHandAction(playerIndex, handIndex, action));
        choices.appendChild(button);
      });

      const note = document.createElement("p");
      note.className = "action-note";
      const outcome = getHandOutcome(hand);
      note.textContent = outcome ? `${recommendationInfo.reason} Resultat: ${outcome}` : recommendationInfo.reason;

      handCard.append(header, chips, choices);
      if (hand.cards.length || hand.pendingAction || outcome) handCard.appendChild(note);
      elements.playersContainer.appendChild(handCard);
    });
  });
}

function fillRankSelect(select, placeholder = "Carte") {
  select.replaceChildren();
  appendOption(select, "", placeholder);
  RANKS.forEach((rank) => appendOption(select, rank, rank));
}

function renderApp() {
  const stats = getCountStats();

  elements.runningCount.textContent = signed(stats.running);
  elements.trueCount.textContent = stats.trueCount.toFixed(1);
  elements.seenCount.textContent = `${stats.seen}`;
  elements.decksRemaining.textContent = stats.displayDecksRemaining.toFixed(1);
  elements.deckCount.value = `${state.deckCount}`;
  elements.baseBet.value = `${state.baseBet}`;
  elements.undoButton.disabled = state.history.length === 0;

  renderVpnControls();
  renderRulesControls();
  renderEdgeStatus(stats);
  renderBetSuggestion(stats);
  renderActionRecommendation(stats);
  renderQuickTargetControls();
  renderTable();
  renderHistory();
}

function drawPlaceholder() {
  if (!elements.photoCanvas || !photoContext) return;

  elements.photoCanvas.width = 640;
  elements.photoCanvas.height = 420;
  photoContext.clearRect(0, 0, elements.photoCanvas.width, elements.photoCanvas.height);
  photoContext.fillStyle = "#f8faf7";
  photoContext.fillRect(0, 0, elements.photoCanvas.width, elements.photoCanvas.height);
  photoContext.fillStyle = "#68756d";
  photoContext.font = "700 28px system-ui, sans-serif";
  photoContext.textAlign = "center";
  photoContext.textBaseline = "middle";
  photoContext.fillText("Aucune photo chargee", elements.photoCanvas.width / 2, elements.photoCanvas.height / 2);
}

function drawPhoto() {
  if (!elements.photoCanvas || !photoContext) return;

  if (!state.photoLoaded || !state.photoImage) {
    drawPlaceholder();
    return;
  }

  drawRawPhoto();
  drawDetections();
}

function drawRawPhoto() {
  if (!elements.photoCanvas || !photoContext) return;

  photoContext.clearRect(0, 0, elements.photoCanvas.width, elements.photoCanvas.height);
  photoContext.drawImage(state.photoImage, 0, 0, elements.photoCanvas.width, elements.photoCanvas.height);
}

function drawDetections() {
  if (!elements.photoCanvas || !photoContext) return;

  state.detections.forEach((detection, index) => {
    const { x, y, width, height } = detection.box;
    photoContext.save();
    photoContext.lineWidth = Math.max(3, Math.round(elements.photoCanvas.width / 360));
    photoContext.strokeStyle = detection.rank ? "#126a4c" : "#b75d18";
    photoContext.fillStyle = detection.rank ? "#126a4c" : "#b75d18";
    photoContext.strokeRect(x, y, width, height);
    if (detection.rankBox) {
      photoContext.strokeStyle = "#245a8d";
      photoContext.lineWidth = Math.max(2, Math.round(elements.photoCanvas.width / 520));
      photoContext.strokeRect(detection.rankBox.x, detection.rankBox.y, detection.rankBox.width, detection.rankBox.height);
      photoContext.fillStyle = detection.rank ? "#126a4c" : "#b75d18";
    }
    photoContext.font = "800 20px system-ui, sans-serif";
    photoContext.textBaseline = "top";
    photoContext.fillRect(x, Math.max(0, y - 28), 34, 26);
    photoContext.fillStyle = "#ffffff";
    photoContext.fillText(`${index + 1}`, x + 10, Math.max(0, y - 25));
    photoContext.restore();
  });
}

function loadPhoto(file) {
  if (!file || !elements.photoCanvas) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const image = new Image();
    image.addEventListener("load", () => {
      const scale = Math.min(1120 / image.width, 780 / image.height, 1);
      elements.photoCanvas.width = Math.max(1, Math.round(image.width * scale));
      elements.photoCanvas.height = Math.max(1, Math.round(image.height * scale));

      state.photoLoaded = true;
      state.photoName = file.name;
      state.photoImage = image;
      state.detections = [];

      drawPhoto();
      elements.analyzeButton.disabled = false;
      elements.addDetectedButton.disabled = true;
      elements.addMissingButton.disabled = false;
      elements.detectionList.replaceChildren();
      elements.detectionSummary.textContent = `${file.name} chargee.`;
    });

    image.src = reader.result;
  });

  reader.readAsDataURL(file);
}

function analyzePhoto() {
  if (!state.photoLoaded) return;

  drawRawPhoto();

  const rankDetections = detectRankDetections();
  const fallbackDetections = detectCardBoxes()
    .filter((box) => !rankDetections.some((detection) => detectionInsideBox(detection, box)))
    .map((box) => {
      const suggestion = suggestRank(box);
      return {
        id: createId(),
        box,
        rankBox: null,
        rank: suggestion.confidence >= 0.56 ? suggestion.rank : "",
        suggestedRank: suggestion.rank,
        confidence: suggestion.confidence,
        method: "rectangle",
      };
    });

  state.detections = [...rankDetections, ...fallbackDetections]
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
    .slice(0, 32)
    .map((detection, index) => ({ ...detection, index }));

  drawPhoto();
  renderDetections();
}

function detectionInsideBox(detection, box) {
  const sourceBox = detection.rankBox || detection.box;
  const centerX = sourceBox.x + sourceBox.width / 2;
  const centerY = sourceBox.y + sourceBox.height / 2;
  return (
    centerX >= box.x &&
    centerX <= box.x + box.width &&
    centerY >= box.y &&
    centerY <= box.y + box.height
  );
}

function detectRankDetections() {
  if (!rankTemplates) rankTemplates = buildRankTemplates();

  const masks = buildCardPixelMasks(elements.photoCanvas);
  const components = findInkComponents(masks);
  const candidates = removeLikelySuitCandidates(buildRankCandidates(components, masks));

  return dedupeRankCandidates(candidates)
    .map((candidate) => ({
      id: createId(),
      box: estimateCardBoxFromRankBox(candidate.box, masks.width, masks.height),
      rankBox: candidate.box,
      rank: candidate.confidence >= RANK_CONFIDENCE_THRESHOLD ? candidate.rank : "",
      suggestedRank: candidate.rank,
      confidence: candidate.confidence,
      method: "rang",
    }))
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
}

function buildCardPixelMasks(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const width = canvas.width;
  const height = canvas.height;
  const imageData = context.getImageData(0, 0, width, height);
  const source = imageData.data;
  const whiteMask = new Uint8Array(width * height);
  const inkMask = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const red = source[offset];
      const green = source[offset + 1];
      const blue = source[offset + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      const saturation = max - min;
      const isWhite = (luminance > 158 && saturation < 92) || (luminance > 202 && saturation < 145);
      const isBlackInk = luminance < 118 && saturation < 112;
      const isRedInk = red > 122 && red - green > 28 && red - blue > 24 && luminance < 226;

      if (isWhite) whiteMask[y * width + x] = 1;
      if (isBlackInk || isRedInk) inkMask[y * width + x] = 1;
    }
  }

  return {
    width,
    height,
    whiteMask,
    inkMask,
    whiteIntegral: buildIntegralMask(whiteMask, width, height),
  };
}

function buildIntegralMask(mask, width, height) {
  const integral = new Uint32Array((width + 1) * (height + 1));

  for (let y = 1; y <= height; y += 1) {
    let rowTotal = 0;
    for (let x = 1; x <= width; x += 1) {
      rowTotal += mask[(y - 1) * width + (x - 1)];
      integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + rowTotal;
    }
  }

  return integral;
}

function maskArea(integral, width, x, y, boxWidth, boxHeight) {
  const left = Math.round(clamp(x, 0, width));
  const height = Math.round(integral.length / (width + 1)) - 1;
  const top = Math.round(clamp(y, 0, height));
  const right = Math.round(clamp(x + boxWidth, 0, width));
  const bottom = Math.round(clamp(y + boxHeight, 0, height));
  const stride = width + 1;

  return (
    integral[bottom * stride + right] -
    integral[top * stride + right] -
    integral[bottom * stride + left] +
    integral[top * stride + left]
  );
}

function findInkComponents(masks) {
  const { width, height, inkMask, whiteIntegral } = masks;
  const visited = new Uint8Array(width * height);
  const components = [];
  const queue = [];
  const minHeight = Math.max(7, Math.round(height * 0.012));
  const maxHeight = Math.max(32, Math.round(height * 0.14));
  const maxWidth = Math.max(34, Math.round(width * 0.12));
  const minArea = Math.max(7, Math.round((width * height) / 140000));
  const maxArea = Math.max(600, Math.round(width * height * 0.018));

  for (let startY = 0; startY < height; startY += 1) {
    for (let startX = 0; startX < width; startX += 1) {
      const startIndex = startY * width + startX;
      if (!inkMask[startIndex] || visited[startIndex]) continue;

      let head = 0;
      let area = 0;
      let minX = startX;
      let maxX = startX;
      let minY = startY;
      let maxY = startY;

      queue.length = 0;
      queue.push(startIndex);
      visited[startIndex] = 1;

      while (head < queue.length) {
        const index = queue[head];
        const x = index % width;
        const y = Math.floor(index / width);
        head += 1;
        area += 1;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        visitInkNeighbor(x + 1, y);
        visitInkNeighbor(x - 1, y);
        visitInkNeighbor(x, y + 1);
        visitInkNeighbor(x, y - 1);
        visitInkNeighbor(x + 1, y + 1);
        visitInkNeighbor(x - 1, y - 1);
        visitInkNeighbor(x + 1, y - 1);
        visitInkNeighbor(x - 1, y + 1);
      }

      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const fill = area / (boxWidth * boxHeight);
      const margin = Math.max(5, Math.round(boxHeight * 0.75));
      const supportBox = expandBox({ x: minX, y: minY, width: boxWidth, height: boxHeight }, margin, width, height);
      const whiteRatio =
        maskArea(whiteIntegral, width, supportBox.x, supportBox.y, supportBox.width, supportBox.height) /
        Math.max(1, supportBox.width * supportBox.height);

      if (
        area >= minArea &&
        area <= maxArea &&
        boxWidth >= 2 &&
        boxWidth <= maxWidth &&
        boxHeight >= minHeight &&
        boxHeight <= maxHeight &&
        fill >= 0.06 &&
        fill <= 0.74 &&
        whiteRatio >= 0.25
      ) {
        components.push({
          x: minX,
          y: minY,
          width: boxWidth,
          height: boxHeight,
          area,
          fill,
          whiteRatio,
        });
      }

      function visitInkNeighbor(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const index = y * width + x;
        if (!inkMask[index] || visited[index]) return;
        visited[index] = 1;
        queue.push(index);
      }
    }
  }

  return components;
}

function buildRankCandidates(components, masks) {
  const candidates = [];
  const sorted = [...components].sort((a, b) => a.x - b.x || a.y - b.y);

  sorted.forEach((component) => {
    const paddedBox = expandBox(component, Math.max(2, component.height * 0.2), masks.width, masks.height);
    const suggestion = classifyRankBox(paddedBox);

    if (suggestion.rank && suggestion.rank !== "10" && suggestion.confidence >= 0.31) {
      candidates.push({
        box: paddedBox,
        rank: suggestion.rank,
        confidence: suggestion.confidence,
        partCount: 1,
      });
    }
  });

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const left = sorted[i].x <= sorted[j].x ? sorted[i] : sorted[j];
      const right = left === sorted[i] ? sorted[j] : sorted[i];

      if (!couldBeTenPair(left, right)) continue;

      const pairBox = expandBox(rectUnion(left, right), Math.max(2, (left.height + right.height) * 0.12), masks.width, masks.height);
      const suggestion = classifyRankBox(pairBox);

      if (suggestion.rank === "10" && suggestion.confidence >= 0.29) {
        candidates.push({
          box: pairBox,
          rank: "10",
          confidence: suggestion.confidence + 0.05,
          partCount: 2,
        });
      }
    }
  }

  return candidates;
}

function couldBeTenPair(left, right) {
  const leftCenterY = left.y + left.height / 2;
  const rightCenterY = right.y + right.height / 2;
  const averageHeight = (left.height + right.height) / 2;
  const gap = right.x - (left.x + left.width);
  const heightRatio = Math.min(left.height, right.height) / Math.max(left.height, right.height);
  const union = rectUnion(left, right);
  const aspect = union.width / union.height;

  return (
    gap >= -Math.max(2, averageHeight * 0.18) &&
    gap <= Math.max(12, averageHeight * 0.82) &&
    Math.abs(leftCenterY - rightCenterY) <= Math.max(5, averageHeight * 0.34) &&
    heightRatio >= 0.48 &&
    aspect >= 0.42 &&
    aspect <= 1.75
  );
}

function classifyRankBox(box) {
  const mask = extractNormalizedMask(box.x, box.y, box.width, box.height);
  if (!mask) return { rank: "", confidence: 0 };

  return classifyRankMask(mask);
}

function classifyRankMask(mask) {
  let best = { rank: "", score: Number.POSITIVE_INFINITY };

  rankTemplates.forEach((template) => {
    const score = maskDistance(mask, template.mask);
    if (score < best.score) {
      best = { rank: template.rank, score };
    }
  });

  return {
    rank: best.rank,
    confidence: Math.max(0, Math.min(1, 1 - best.score)),
  };
}

function removeLikelySuitCandidates(candidates) {
  return candidates.filter((candidate) => {
    const candidateCenterX = candidate.box.x + candidate.box.width / 2;

    const hasRankAbove = candidates.some((other) => {
      if (other === candidate) return false;
      const otherCenterX = other.box.x + other.box.width / 2;
      const verticalGap = candidate.box.y - (other.box.y + other.box.height);
      const maxHeight = Math.max(candidate.box.height, other.box.height);

      return (
        other.box.y < candidate.box.y &&
        verticalGap >= -maxHeight * 0.25 &&
        verticalGap <= maxHeight * 1.85 &&
        Math.abs(candidateCenterX - otherCenterX) <= maxHeight * 0.8 &&
        other.confidence >= candidate.confidence * 0.72
      );
    });

    return !hasRankAbove;
  });
}

function dedupeRankCandidates(candidates) {
  const ordered = [...candidates].sort((a, b) => candidatePriority(b) - candidatePriority(a));
  const accepted = [];

  ordered.forEach((candidate) => {
    const duplicate = accepted.some((existing) => {
      const centerDistance = distanceBetweenCenters(existing.box, candidate.box);
      const maxHeight = Math.max(existing.box.height, candidate.box.height);
      return overlapRatio(existing.box, candidate.box) > 0.28 || centerDistance < maxHeight * 0.72;
    });

    if (!duplicate) accepted.push(candidate);
  });

  return accepted
    .filter((candidate) => candidate.confidence >= 0.34)
    .slice(0, 32)
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
}

function candidatePriority(candidate) {
  return candidate.confidence + (candidate.rank === "10" ? 0.08 : 0) + (candidate.partCount > 1 ? 0.04 : 0);
}

function estimateCardBoxFromRankBox(rankBox, canvasWidth, canvasHeight) {
  const rankHeight = Math.max(12, rankBox.height);
  const cardWidth = Math.max(42, rankBox.width * 3.25, rankHeight * 2.65);
  const cardHeight = cardWidth * 1.38;
  const x = clamp(rankBox.x - rankHeight * 0.42, 0, canvasWidth);
  const y = clamp(rankBox.y - rankHeight * 0.46, 0, canvasHeight);

  return {
    x,
    y,
    width: clamp(cardWidth, 12, canvasWidth - x),
    height: clamp(cardHeight, 16, canvasHeight - y),
  };
}

function detectCardBoxes() {
  const source = elements.photoCanvas;
  const maxSize = 430;
  const scale = Math.min(maxSize / source.width, maxSize / source.height, 1);
  const detectionCanvas = document.createElement("canvas");
  detectionCanvas.width = Math.max(1, Math.round(source.width * scale));
  detectionCanvas.height = Math.max(1, Math.round(source.height * scale));

  const context = detectionCanvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(source, 0, 0, detectionCanvas.width, detectionCanvas.height);

  const width = detectionCanvas.width;
  const height = detectionCanvas.height;
  const imageData = context.getImageData(0, 0, width, height).data;
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const red = imageData[offset];
      const green = imageData[offset + 1];
      const blue = imageData[offset + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      const saturation = max - min;

      if ((luminance > 178 && saturation < 72) || (luminance > 218 && saturation < 118)) {
        mask[y * width + x] = 1;
      }
    }
  }

  const visited = new Uint8Array(width * height);
  const boxes = [];
  const queueX = [];
  const queueY = [];
  const minArea = Math.max(80, Math.round(width * height * 0.003));
  const maxArea = Math.round(width * height * 0.55);

  for (let startY = 0; startY < height; startY += 1) {
    for (let startX = 0; startX < width; startX += 1) {
      const startIndex = startY * width + startX;
      if (!mask[startIndex] || visited[startIndex]) continue;

      let head = 0;
      let area = 0;
      let minX = startX;
      let maxX = startX;
      let minY = startY;
      let maxY = startY;

      queueX.length = 0;
      queueY.length = 0;
      queueX.push(startX);
      queueY.push(startY);
      visited[startIndex] = 1;

      while (head < queueX.length) {
        const x = queueX[head];
        const y = queueY[head];
        head += 1;
        area += 1;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        visitNeighbor(x + 1, y);
        visitNeighbor(x - 1, y);
        visitNeighbor(x, y + 1);
        visitNeighbor(x, y - 1);
      }

      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const fill = area / (boxWidth * boxHeight);
      const aspect = boxWidth / boxHeight;
      const looksPortrait = aspect >= 0.42 && aspect <= 0.86;
      const looksLandscape = aspect >= 1.12 && aspect <= 2.25;
      const bigEnough = area >= minArea && area <= maxArea && boxWidth > 16 && boxHeight > 20;

      if (bigEnough && fill > 0.38 && (looksPortrait || looksLandscape)) {
        const padding = 3 / scale;
        boxes.push({
          x: clamp(minX / scale - padding, 0, source.width),
          y: clamp(minY / scale - padding, 0, source.height),
          width: clamp(boxWidth / scale + padding * 2, 0, source.width),
          height: clamp(boxHeight / scale + padding * 2, 0, source.height),
          area,
        });
      }

      function visitNeighbor(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const index = y * width + x;
        if (!mask[index] || visited[index]) return;
        visited[index] = 1;
        queueX.push(x);
        queueY.push(y);
      }
    }
  }

  return mergeBoxes(boxes)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, 24);
}

function mergeBoxes(boxes) {
  const sorted = [...boxes].sort((a, b) => b.area - a.area);
  const result = [];

  sorted.forEach((box) => {
    const duplicate = result.some((existing) => overlapRatio(existing, box) > 0.52);
    if (!duplicate) result.push(box);
  });

  return result;
}

function overlapRatio(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const overlapWidth = Math.max(0, right - left);
  const overlapHeight = Math.max(0, bottom - top);
  const overlapArea = overlapWidth * overlapHeight;
  const smallerArea = Math.min(a.width * a.height, b.width * b.height);
  return smallerArea ? overlapArea / smallerArea : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function expandBox(box, margin, maxWidth, maxHeight) {
  const x = clamp(box.x - margin, 0, maxWidth);
  const y = clamp(box.y - margin, 0, maxHeight);
  const right = clamp(box.x + box.width + margin, 0, maxWidth);
  const bottom = clamp(box.y + box.height + margin, 0, maxHeight);

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

function rectUnion(a, b) {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function distanceBetweenCenters(a, b) {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;

  return Math.hypot(ax - bx, ay - by);
}

function suggestRank(box) {
  if (!rankTemplates) rankTemplates = buildRankTemplates();

  const upright = rankMaskFromBox(box, false);
  const inverted = rankMaskFromBox(box, true);
  const masks = [upright, inverted].filter(Boolean);

  if (!masks.length) {
    return { rank: "", confidence: 0 };
  }

  let best = { rank: "", score: Number.POSITIVE_INFINITY };
  masks.forEach((mask) => {
    const suggestion = classifyRankMask(mask);
    const score = 1 - suggestion.confidence;
    if (score < best.score) {
      best = { rank: suggestion.rank, score };
    }
  });

  return {
    rank: best.rank,
    confidence: Math.max(0, Math.min(1, 1 - best.score)),
  };
}

function rankMaskFromBox(box, inverted) {
  const cardWidth = box.width;
  const cardHeight = box.height;
  const cornerWidth = cardWidth * 0.26;
  const cornerHeight = cardHeight * 0.2;
  const sourceX = inverted ? box.x + cardWidth - cornerWidth - cardWidth * 0.03 : box.x + cardWidth * 0.03;
  const sourceY = inverted ? box.y + cardHeight - cornerHeight - cardHeight * 0.03 : box.y + cardHeight * 0.03;

  return extractNormalizedMask(sourceX, sourceY, cornerWidth, cornerHeight);
}

function extractNormalizedMask(sourceX, sourceY, sourceWidth, sourceHeight) {
  const width = Math.max(8, Math.round(sourceWidth));
  const height = Math.max(8, Math.round(sourceHeight));
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = width;
  cropCanvas.height = height;

  const context = cropCanvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(elements.photoCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

  return normalizedDarkMask(context.getImageData(0, 0, width, height), width, height);
}

function normalizedDarkMask(imageData, width, height) {
  const source = imageData.data;
  const darkPixels = new Uint8Array(width * height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const red = source[offset];
      const green = source[offset + 1];
      const blue = source[offset + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      const saturation = max - min;
      const isInk = luminance < 105 || (saturation > 46 && luminance < 176);

      if (isInk) {
        const index = y * width + x;
        darkPixels[index] = 1;
        count += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count < 8 || maxX < minX || maxY < minY) return null;

  const mask = new Uint8Array(TEMPLATE_WIDTH * TEMPLATE_HEIGHT);
  const sourceWidth = Math.max(1, maxX - minX + 1);
  const sourceHeight = Math.max(1, maxY - minY + 1);

  for (let y = 0; y < TEMPLATE_HEIGHT; y += 1) {
    for (let x = 0; x < TEMPLATE_WIDTH; x += 1) {
      const sourcePixelX = minX + Math.floor((x / TEMPLATE_WIDTH) * sourceWidth);
      const sourcePixelY = minY + Math.floor((y / TEMPLATE_HEIGHT) * sourceHeight);
      mask[y * TEMPLATE_WIDTH + x] = darkPixels[sourcePixelY * width + sourcePixelX];
    }
  }

  return mask;
}

function buildRankTemplates() {
  const fontFamilies = [
    "Arial, sans-serif",
    "Arial Black, Arial, sans-serif",
    "Verdana, sans-serif",
    "Georgia, serif",
    "Times New Roman, serif",
  ];
  const templates = [];

  RANKS.forEach((rank) => {
    fontFamilies.forEach((family) => {
      [0, 3, -3].forEach((offset) => {
        const canvas = document.createElement("canvas");
        canvas.width = 96;
        canvas.height = 96;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#000000";
        context.textBaseline = "top";
        context.font = `900 ${rank === "10" ? 42 + offset : 56 + offset}px ${family}`;
        context.fillText(rank, 8, 5);

        const mask = normalizedDarkMask(context.getImageData(0, 0, canvas.width, canvas.height), canvas.width, canvas.height);
        if (mask) {
          templates.push({ rank, mask });
        }
      });
    });
  });

  return templates;
}

function maskDistance(maskA, maskB) {
  let different = 0;
  let union = 0;

  for (let i = 0; i < maskA.length; i += 1) {
    const a = maskA[i];
    const b = maskB[i];
    if (a || b) union += 1;
    if (a !== b) different += 1;
  }

  return union ? different / union : 1;
}

function renderDetections() {
  elements.detectionList.replaceChildren();

  if (!state.detections.length) {
    elements.detectionSummary.textContent = "Aucune carte detectee automatiquement.";
    elements.addDetectedButton.disabled = true;

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Essaie une photo plus nette, puis utilise la saisie manuelle pour les cartes manquantes.";
    elements.detectionList.appendChild(empty);
    return;
  }

  const readable = state.detections.filter((detection) => detection.rank).length;
  elements.detectionSummary.textContent = `${state.detections.length} carte(s) detectee(s), ${readable} valeur(s) preselectionnee(s).`;

  state.detections.forEach((detection, index) => {
    const item = document.createElement("div");
    item.className = "detection-card";

    const thumb = document.createElement("canvas");
    thumb.width = 74;
    thumb.height = 96;
    drawThumb(thumb, detection.box);

    const meta = document.createElement("div");
    meta.className = "detection-meta";

    const title = document.createElement("strong");
    if (detection.method === "rang") {
      title.textContent = `Carte ${index + 1} - coin lu`;
    } else if (detection.method === "manuel-photo") {
      title.textContent = `Carte ${index + 1} - manuelle`;
    } else {
      title.textContent = `Carte ${index + 1}`;
    }

    const confidence = document.createElement("span");
    confidence.className = "confidence";
    confidence.textContent = detection.method === "manuel-photo"
      ? "Choisis la valeur a ajouter"
      : detection.suggestedRank
      ? `Suggestion ${detection.suggestedRank} - ${Math.round(detection.confidence * 100)}%`
      : "Aucune suggestion fiable";

    const select = document.createElement("select");
    select.setAttribute("aria-label", `Valeur de la carte ${index + 1}`);
    appendOption(select, "", "Inconnue");
    appendOption(select, "skip", "Ignorer");
    RANKS.forEach((rank) => appendOption(select, rank, `${rank} (${signed(deltaForRank(rank))})`));
    select.value = detection.rank || "";
    select.addEventListener("change", () => {
      detection.rank = select.value === "skip" ? "" : select.value;
      updateAddDetectedButton();
      drawPhoto();
      renderDetectionSummaryOnly();
    });

    meta.append(title, confidence, select);
    item.append(thumb, meta);
    elements.detectionList.appendChild(item);
  });

  updateAddDetectedButton();
}

function appendOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function drawThumb(canvas, box) {
  const context = canvas.getContext("2d");
  context.fillStyle = "#f7f7f5";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (!state.photoImage) return;

  const padding = 6;
  const cropX = clamp(box.x - padding, 0, elements.photoCanvas.width);
  const cropY = clamp(box.y - padding, 0, elements.photoCanvas.height);
  const cropWidth = clamp(box.width + padding * 2, 1, elements.photoCanvas.width - cropX);
  const cropHeight = clamp(box.height + padding * 2, 1, elements.photoCanvas.height - cropY);
  const scaleX = state.photoImage.width / elements.photoCanvas.width;
  const scaleY = state.photoImage.height / elements.photoCanvas.height;

  context.drawImage(
    state.photoImage,
    cropX * scaleX,
    cropY * scaleY,
    cropWidth * scaleX,
    cropHeight * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );
}

function renderDetectionSummaryOnly() {
  if (!state.detections.length) return;
  const readable = state.detections.filter((detection) => detection.rank).length;
  elements.detectionSummary.textContent = `${state.detections.length} carte(s) detectee(s), ${readable} valeur(s) selectionnee(s).`;
}

function updateAddDetectedButton() {
  elements.addDetectedButton.disabled = !state.detections.some((detection) => RANKS.includes(detection.rank));
}

function addDetectedCards() {
  const cards = state.detections
    .filter((detection) => RANKS.includes(detection.rank))
    .map((detection) => ({ rank: detection.rank, source: "photo" }));

  if (!cards.length) return;

  addCards(cards);
  elements.detectionSummary.textContent = `${cards.length} carte(s) ajoutee(s) au compteur.`;
  state.detections = [];
  elements.detectionList.replaceChildren();
  elements.addDetectedButton.disabled = true;
  drawPhoto();
}

function addMissingDetection() {
  if (!state.photoLoaded) return;

  const side = Math.max(42, Math.min(elements.photoCanvas.width, elements.photoCanvas.height) * 0.14);
  state.detections.push({
    id: createId(),
    box: {
      x: clamp(elements.photoCanvas.width / 2 - side / 2, 0, elements.photoCanvas.width),
      y: clamp(elements.photoCanvas.height / 2 - side * 0.7, 0, elements.photoCanvas.height),
      width: clamp(side, 12, elements.photoCanvas.width),
      height: clamp(side * 1.38, 16, elements.photoCanvas.height),
    },
    rankBox: null,
    rank: "",
    suggestedRank: "",
    confidence: 0,
    method: "manuel-photo",
  });

  drawPhoto();
  renderDetections();
}

function bindEvents() {
  elements.deckCount.addEventListener("change", () => {
    state.deckCount = clamp(Math.round(Number(elements.deckCount.value) || 6), 1, 12);
    saveState();
    renderApp();
  });

  elements.baseBet.addEventListener("change", () => {
    state.baseBet = clamp(Math.round(Number(elements.baseBet.value) || 10), 1, 100000);
    if (!isBettingLocked()) applyRoundBet(state.baseBet);
    saveState();
    renderApp();
  });

  elements.vpnCountrySelect.addEventListener("change", () => setVpnCountry(elements.vpnCountrySelect.value));
  elements.vpnToggleButton.addEventListener("click", toggleVpn);

  elements.dealerSoft17Rule.addEventListener("change", () => {
    updateRule("dealerHitsSoft17", elements.dealerSoft17Rule.value === "hit");
  });
  elements.surrenderAllowed.addEventListener("change", () => {
    updateRule("surrenderAllowed", elements.surrenderAllowed.checked);
  });
  elements.doubleAfterSplitAllowed.addEventListener("change", () => {
    updateRule("doubleAfterSplitAllowed", elements.doubleAfterSplitAllowed.checked);
  });
  elements.insuranceAllowed.addEventListener("change", () => {
    updateRule("insuranceAllowed", elements.insuranceAllowed.checked);
  });
  elements.splitAcesOneCard.addEventListener("change", () => {
    updateRule("splitAcesOneCard", elements.splitAcesOneCard.checked);
  });

  elements.undoButton.addEventListener("click", undoLastCard);
  elements.resetButton.addEventListener("click", resetShoe);
  elements.clearHistoryButton.addEventListener("click", resetShoe);
  elements.quickTargetSelect.addEventListener("change", () => setQuickTarget(elements.quickTargetSelect.value));
  elements.playerCount.addEventListener("change", () => setPlayerCount(elements.playerCount.value));
  elements.countTableButton.addEventListener("click", countVisibleTableCards);
  elements.clearTableButton.addEventListener("click", clearTable);
  elements.clearRoundMemoryButton.addEventListener("click", clearRoundMemory);
  elements.dealButton?.addEventListener("click", dealRound);
  elements.doubleBetsButton?.addEventListener("click", doubleTableBets);
  elements.clearBetsButton?.addEventListener("click", clearTableBets);
  elements.undoBetButton?.addEventListener("click", undoTableBet);
  elements.selectDealerButton.addEventListener("click", () => setQuickTarget("dealer"));
  elements.addDealerCardButton.addEventListener("click", addDealerCard);
  elements.clearDealerButton.addEventListener("click", clearDealerCards);
  elements.photoInput?.addEventListener("change", (event) => loadPhoto(event.target.files[0]));
  elements.analyzeButton?.addEventListener("click", analyzePhoto);
  elements.addDetectedButton?.addEventListener("click", addDetectedCards);
  elements.addMissingButton?.addEventListener("click", addMissingDetection);
}

loadState();
bindEvents();
fillVpnCountrySelect();
fillRankSelect(elements.dealerCardSelect, "Carte croupier");
renderRankGrid();
renderApp();
drawPlaceholder();
