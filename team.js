let ALL_PLAYERS = [];
let retainSearchLocked = false;


async function loadAllPlayersForSearch() {
    const snap = await db.collection("players").get();
    ALL_PLAYERS = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

document.getElementById("playerSearch").addEventListener("input", function () {
   retainSearchLocked = true; 
    const q = this.value.toLowerCase().trim();
    const box = document.getElementById("searchResults");

    if (!q) {
        box.style.display = "none";
        return;
    }

    const results = ALL_PLAYERS.filter(p =>
        p.name.toLowerCase().includes(q)
    ).slice(0, 12);

    let html = "";
   results.forEach(p => {
    html += `
      <div onclick="selectRetainPlayer('${p.id}','${p.name}')"
           style="
             padding:8px;
             cursor:pointer;
             border-bottom:1px solid #eee;
             color:black;
             background:white;
           ">
         ${p.name} — ${p.role}
      </div>
    `;
});


    box.innerHTML = html;
    box.style.display = "block";
});

function selectRetainPlayer(id, name) {
    document.getElementById("retainPlayerId").value = id;
    document.getElementById("playerSearch").value = name;
    document.getElementById("searchResults").style.display = "none";
}

function formatBasePrice(amount) {
  if (!amount || isNaN(amount)) return "-";

  // Crores
  if (amount >= 10000000) {
    return (amount / 10000000) + " Cr";
  }
  // Lakhs
  return (amount / 100000) + " L";
}
function parsePrice(input) {
  input = input.trim().toUpperCase();

  if (input.endsWith("CR")) {
    const num = parseFloat(input.replace("CR", "").trim());
    return num * 10000000; // convert crores
  }

  if (input.endsWith("L")) {
    const num = parseFloat(input.replace("L", "").trim());
    return num * 100000; // convert lakhs
  }

  return NaN; // invalid
}

/* ---------------------------------------------------
   BID INCREMENT RULES
---------------------------------------------------- */
function getIncrement(currentBid) {

  if (currentBid < 10000000) return 1000000;     // +10 L
  if (currentBid < 50000000) return 2000000;     // +20 L
  return 2500000;                                // +25 L
}



/* ---------------------------------------------------
   TEAM NAME FROM LOGIN
---------------------------------------------------- */
let TEAM_NAME = localStorage.getItem("team");

if (!TEAM_NAME) {
  alert("Login again!");
  window.location.href = "index.html";
}

let currentAuction = null;


/* ---------------------------------------------------
   TEAM LOGOS
---------------------------------------------------- */
const TEAM_LOGOS = {
  "CSK": "csk.png",
  "MI": "mi.jpg",
  "RCB": "rcb.jpg",
  "KKR": "kkr.jpg",
  "RR": "rr.jpg",
  "SRH": "srh.jpg",
  "DC": "dc.png",
  "LSG": "lsg.jpg",
  "GT": "gt.jpg",
  "PBKS": "pk.jpg"
};

function getPlayerCategory(country) {
  const overseas = [
    "Australia","England","New Zealand","South Africa","Sri Lanka",
    "Bangladesh","Afghanistan","Ireland","West Indies","Zimbabwe",
    "Nepal","Netherlands"
  ];
  return overseas.includes(country) ? "Overseas" : "Indian";
}


/* ---------------------------------------------------
   UPDATE UI HEADER
---------------------------------------------------- */
document.getElementById("teamTitle").innerText = `Team Dashboard — ${TEAM_NAME}`;
document.getElementById("teamLogo").src = TEAM_LOGOS[TEAM_NAME] || "default-player.png";


/* ---------------------------------------------------
   ENSURE TEAM EXISTS
---------------------------------------------------- */
// Ensure team exists — DO NOT RESET PLAYERS
db.collection("teams").doc(TEAM_NAME).set({
  name: TEAM_NAME
}, { merge: true });




/* ---------------------------------------------------
   LOAD TEAM SQUAD + PURSE
---------------------------------------------------- */
function loadTeamInfo() {
  db.collection("teams").doc(TEAM_NAME).onSnapshot(async snap => {
    const searchValue = document.getElementById("playerSearch").value;
    if (retainSearchLocked) {
    document.getElementById("playerSearch").value = searchValue;
}


    const t = snap.data();
    if (!t) return;

    // PURSE DISPLAY — NOW FORMATTED
    document.getElementById("purse").innerText = formatBasePrice(t.purse);

    const batDiv = document.getElementById("batList");
    const bowlDiv = document.getElementById("bowlList");
    const arDiv = document.getElementById("arList");
    const wkDiv = document.getElementById("wkList");

    batDiv.innerHTML = bowlDiv.innerHTML =
      arDiv.innerHTML = wkDiv.innerHTML = "";

    for (const pid of t.players) {
      const pdoc = await db.collection("players").doc(pid).get();
      if (!pdoc.exists) continue;

      const p = pdoc.data();

      const html = `
        <div class="playerCard">
          <b>${p.name}</b><br>
          <span>${p.country} (${getPlayerCategory(p.country)})</span><br>
          <small>₹ ${formatBasePrice(p.soldPrice || p.basePrice)}</small>
        </div>
      `;

      const r = p.role.toLowerCase();
      if (r.includes("bowl")) bowlDiv.innerHTML += html;
      else if (r.includes("wicket") || r === "wk") wkDiv.innerHTML += html;
      else if (r.includes("all")) arDiv.innerHTML += html;
      else batDiv.innerHTML += html;
    }
  });
}


/* ---------------------------------------------------
   LIVE AUCTION LISTENER
---------------------------------------------------- */
function listenToAuction() {
  db.collection("auction").doc("current").onSnapshot(async snap => {
    const a = snap.data()|| {};
    if (!a || !a.playerID) {
    clearAuctionUI();
    return;
}


    currentAuction = a;

    const pdoc = await db.collection("players").doc(a.playerID).get();
    if (!pdoc.exists) return clearAuctionUI();

    const p = pdoc.data();

    // PLAYER AVATAR
    document.getElementById("pImg").src = p.imageUrl || "default-player.png";

    // PLAYER DETAILS
    document.getElementById("pName").innerText = p.name;
    document.getElementById("pRole").innerText = p.role;
    document.getElementById("pCountry").innerText = p.country;

    // FORMATTED BASE PRICE
    document.getElementById("basePrice").innerText = formatBasePrice(p.basePrice);

    // FORMATTED CURRENT BID
    document.getElementById("pBid").innerText = formatBasePrice(a.currentBid);

    // HIGHEST BIDDER
    document.getElementById("highest").innerText = a.highestBidder || "-";

    // INTERESTED TEAMS LIST
    document.getElementById("interest").innerText =
      (a.interestedTeams || []).join(", ") ;
  });
}


/* ---------------------------------------------------
   CLEAR AUCTION UI
---------------------------------------------------- */
function clearAuctionUI() {
  document.getElementById("pImg").src = "default-player.png";
  document.getElementById("pName").innerText = "-";
  document.getElementById("pRole").innerText = "-";
  document.getElementById("pCountry").innerText = "-";
  document.getElementById("basePrice").innerText = "-";
  document.getElementById("pBid").innerText = "-";
  document.getElementById("highest").innerText = "-";
  document.getElementById("interest").innerText = "-";
}


/* ---------------------------------------------------
   PLACE BID
---------------------------------------------------- */
document.getElementById("bidBtn").onclick = async () => {
  if (!currentAuction) return;

  const ref = db.collection("auction").doc("current");
  const snap = await ref.get();
  const data = snap.data();

  // 1️⃣ FIRST BID → DO NOT INCREASE
  if (!data.highestBidder) {
    await ref.update({
      highestBidder: TEAM_NAME,
      interestedTeams: firebase.firestore.FieldValue.arrayUnion(TEAM_NAME)
    });
    console.log("First bid placed at base price");
    return;
  }

  // 2️⃣ Subsequent bids → apply increment
  const increment = getIncrement(data.currentBid);
  const newBid = data.currentBid + increment;

  await ref.update({
    currentBid: newBid,
    highestBidder: TEAM_NAME,
    interestedTeams: firebase.firestore.FieldValue.arrayUnion(TEAM_NAME)
  });

  console.log("Bid:", formatBasePrice(newBid));
};
document.getElementById("retainBtn").onclick = async () => {
  const pid = document.getElementById("retainPlayerId").value.trim();
  const priceInput = document.getElementById("retainPrice").value.trim();
  const msg = document.getElementById("retainMsg");

  if (!pid) {
    alert("Select a player first.");
    return;
  }

  if (!priceInput) {
    alert("Enter a retain price.");
    return;
  }

  const price = parsePrice(priceInput);

  // ❌ INVALID NUMBER
  if (isNaN(price)) {
    alert("Invalid price format. Use 4 Cr or 30 L.");
    return;
  }

  // ❌ PRICE <= 0
  if (price <= 0) {
    alert("Price must be greater than 0.");
    return;
  }

  // ❌ PRICE LESS THAN 30 LAKHS
  if (price < 3000000) {
    alert("Minimum retain price is 30 Lakhs (30 L).");
    return;
  }

  // Fetch player
  const pSnap = await db.collection("players").doc(pid).get();
  if (!pSnap.exists) {
    alert("Player not found.");
    return;
  }

  const player = pSnap.data();

  // Update player as retained
  await db.collection("players").doc(pid).update({
    soldTo: TEAM_NAME,
    soldPrice: price
  });

  // Update team purse
  const tRef = db.collection("teams").doc(TEAM_NAME);
  const tSnap = await tRef.get();
  const t = tSnap.data();

  const newPurse = t.purse - price;

  await tRef.update({
    purse: newPurse,
    players: firebase.firestore.FieldValue.arrayUnion(pid)
  });

  // LOG TO FIRESTORE (admin sees this)
  await db.collection("logs").add({
    text: `${TEAM_NAME} retained ${player.name} for ₹ ${formatBasePrice(price)}`,
    ts: Date.now(),
    type: "retained"
  });

  // SUCCESS ALERT (fixed)
  alert(`${TEAM_NAME} retained ${player.name} for ₹ ${formatBasePrice(price)} successfully!`);

  msg.style.color = "green";
  msg.innerText = `Retained ${player.name} for ₹ ${formatBasePrice(price)} !`;
  document.getElementById("playerSearch").value = "";
document.getElementById("retainPrice").value = "";
document.getElementById("retainPlayerId").value = "";
document.getElementById("searchResults").style.display = "none";

  setTimeout(() => msg.innerText = "", 3000);
};




/* ---------------------------------------------------
   START PAGE LISTENERS
---------------------------------------------------- */
loadTeamInfo();
listenToAuction();
loadAllPlayersForSearch();   // <-- ADD THIS
