/* ---------------------------------------------------
   PRICE FORMATTER → SAME AS ADMIN + VIEWER
---------------------------------------------------- */
function formatBasePrice(amount) {
  if (!amount || isNaN(amount)) return "-";

  // Crores
  if (amount >= 10000000) {
    return (amount / 10000000) + " Cr";
  }
  // Lakhs
  return (amount / 100000) + " L";
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
db.collection("teams").doc(TEAM_NAME).set({
  name: TEAM_NAME,
  players: []
}, { merge: true });



/* ---------------------------------------------------
   LOAD TEAM SQUAD + PURSE
---------------------------------------------------- */
function loadTeamInfo() {
  db.collection("teams").doc(TEAM_NAME).onSnapshot(async snap => {
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
    const a = snap.data();
    if (!a || !a.playerID) return clearAuctionUI();

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
      (a.interestedTeams || []).join(", ") || "-";
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



/* ---------------------------------------------------
   START PAGE LISTENERS
---------------------------------------------------- */
loadTeamInfo();
listenToAuction();
