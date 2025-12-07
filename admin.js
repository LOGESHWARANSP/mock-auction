// js/admin.js
// Requires firebase.js loaded first
function getIncrement(currentBid) {

  // 1️⃣ Below 1 Crore → +10 Lakhs
  if (currentBid < 10000000) {
    return 1000000; // 10 L
  }

  // 2️⃣ 1 Cr to 5 Cr → +20 Lakhs
  if (currentBid < 50000000) {
    return 2000000; // 20 L
  }

  // 3️⃣ Above 5 Cr → +25 Lakhs
  return 2500000; // 25 L
}
function formatBasePrice(amount) {
  if (!amount || isNaN(amount)) return "-";

  if (amount >= 10000000) {
    return (amount / 10000000) + " Cr";   // 1 Cr, 2 Cr, etc.
  } else {
    return (amount / 100000) + " L";      // 30 L, 50 L, etc.
  }
}


function logAction(txt) {
  const d = new Date().toLocaleTimeString();
  const el = document.getElementById('log');
  if(el) el.innerHTML = `<div>[${d}] ${txt}</div>` + el.innerHTML;
}

async function loadPlayers() {
  const tbody = document.querySelector('#playersTable tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  const snap = await db.collection('players').orderBy('name').get();
  snap.forEach(doc => {
    const p = doc.data();
    const id = doc.id;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.role}</td>
      <td>${formatBasePrice(p.basePrice)}</td>

      <td>${p.soldTo ? 'SOLD' : 'Unsold'}</td>
      <td>${p.soldTo ? '' : `<button onclick="startAuction('${id}')">Start</button>`}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadTeams() {
  const tbody = document.querySelector('#teamsTable tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  const snap = await db.collection('teams').get();
  snap.forEach(doc => {
    const t = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.name}</td><td>₹ ${formatBasePrice(t.purse)}</td>
<td>${(t.players || []).length}</td>`;
    tbody.appendChild(tr);
  });
}

// Start auction for a player
async function startAuction(playerId) {
  const pdoc = await db.collection('players').doc(playerId).get();
  if(!pdoc.exists) return alert('Player not found');
  const p = pdoc.data();
  await db.collection('auction').doc('current').set({
    playerID: playerId,
    currentBid: p.basePrice,
    highestBidder: null,
    interestedTeams: [],
    status: 'IN_PROGRESS'
  });
  logAction(`Started auction for ${p.name} (Base ₹${p.basePrice})`);
}

// Listen to live auction doc updates
db.collection('auction').doc('current').onSnapshot(async snap => {
  if(!snap.exists) return;
  const data = snap.data();
  const lpName = document.getElementById('lpName');
  const lpBid = document.getElementById('lpBid');
  const lpHighest = document.getElementById('lpHighest');
  const lpInterest = document.getElementById('lpInterest');
  const lpImg = document.getElementById('lpImg');

  if(!data.playerID) {
    if(lpName) lpName.innerText = '-';
    if(lpBid) lpBid.innerText = '-';
    if(lpHighest) lpHighest.innerText = '-';
    if(lpInterest) lpInterest.innerText = '-';
    if(lpImg) lpImg.src = 'img/default-player.png';
    return;
  }

  const pdoc = await db.collection('players').doc(data.playerID).get();
  const p = pdoc.exists ? pdoc.data() : null;
  if(lpImg) lpImg.src = p && p.imageUrl ? p.imageUrl : 'img/default-player.png';
  if(lpName) lpName.innerText = p ? p.name : data.playerID;
 if(lpBid) lpBid.innerText = formatBasePrice(data.currentBid);

  if(lpHighest) lpHighest.innerText = data.highestBidder || '-';
  if(lpInterest) lpInterest.innerText = (data.interestedTeams || []).length ? (data.interestedTeams || []).join(', ') : '-';
});

async function increaseBid() {
    const ref = db.collection("auction").doc("current");
    const snap = await ref.get();
    if (!snap.exists) return;

    const data = snap.data();
    let increment = getIncrement(data.currentBid);
    let newBid = data.currentBid + increment;

    await ref.update({
        currentBid: newBid,
        highestBidder: "ADMIN",
        interestedTeams: firebase.firestore.FieldValue.arrayUnion("ADMIN")
    });

    logAction(`Admin placed bid → ₹ ${formatBasePrice(newBid)}`);

}


async function markSold() {
  const ref = db.collection('auction').doc('current');
  const snap = await ref.get();
  if(!snap.exists) return alert('No active auction');
  const data = snap.data();
  if(!data.playerID) return alert('No active player');
  const playerId = data.playerID;
  const finalBid = data.currentBid;
  const team = data.highestBidder;
  if(!team) return alert('No bidder selected');

  // update player
  await db.collection('players').doc(playerId).update({ soldTo: team, soldPrice: finalBid });

  // update team purse and players list
  const teamRef = db.collection('teams').doc(team);
  const tdoc = await teamRef.get();
  if(!tdoc.exists) return alert('Team not found');
  const tdata = tdoc.data();
  const newPurse = (tdata.purse || 0) - finalBid;
  await teamRef.update({
    purse: newPurse,
    players: firebase.firestore.FieldValue.arrayUnion(playerId)
  });

  // clear current auction
await ref.update({
    playerID: null,
    currentBid: 0,
    highestBidder: null,
    interestedTeams: [],
    status: "SOLD"
});


  logAction(`SOLD ${playerId} to ${team} for ₹${formatBasePrice(finalBid)}`);

  await loadPlayers(); await loadTeams();
}

async function cancelAuction() {
  await db.collection('auction').doc('current').set({ playerID: null, currentBid: 0, highestBidder: null, interestedTeams: [], status: 'NOT_STARTED' });
  logAction('Auction cancelled.');
}
document.getElementById("resetTeamsBtn").onclick = async function () {
  const REAL_TEAMS = ["CSK","DC","GT","KKR","LSG","MI","PBKS","RCB","RR","SRH"];
  const INITIAL_PURSE = 1250000000; // 125 Cr

  const msg = document.getElementById("resetMsg");
  msg.innerText = "Resetting… please wait.";

  try {
    const teamsRef = db.collection("teams");

    // DELETE old invalid teams
    const snaps = await teamsRef.get();
    for (const doc of snaps.docs) {
      if (!REAL_TEAMS.includes(doc.id)) {
        await teamsRef.doc(doc.id).delete();
      }
    }

    // RESET valid teams (NO players ARRAY!)
    // 2️⃣ Reset official teams
for (const t of REAL_TEAMS) {

  // 🔥 FIRST remove players field completely
  await db.collection("teams").doc(t).update({
    players: firebase.firestore.FieldValue.delete()
  });

  // 🔥 THEN reset purse + name (no players field recreated)
  await db.collection("teams").doc(t).set({
    name: t,
    purse: INITIAL_PURSE
  }, { merge:true });
}


    msg.style.color = "#00ff9d";
    msg.innerText = "✔ Teams reset successfully!";

  } catch (err) {
    msg.style.color = "tomato";
    msg.innerText = "Error: " + err.message;
  }
};

function getPlayerCategory(country) {
  if (!country) return "India"; // default
  
  const overseasCountries = [
    "Australia", "England", "New Zealand", "South Africa", "Sri Lanka",
    "Bangladesh", "Afghanistan", "Ireland", "West Indies", "Zimbabwe",
    "Nepal", "Netherlands"
  ];

  return overseasCountries.includes(country) ? "Overseas" : "India";
}


document.getElementById("resetTeamBtn").onclick = async () => {
    const team = document.getElementById("resetTeamSelect").value;
    const msg = document.getElementById("resetTeamMsg");

    if (!team) {
        msg.style.color = "red";
        msg.innerText = "Select a team to reset.";
        return;
    }

    msg.style.color = "#ffd700";
    msg.innerText = "Resetting team...";

    const INITIAL_PURSE = 1250000000; // 125 Cr

    try {
        const tRef = db.collection("teams").doc(team);
        const tSnap = await tRef.get();
        const t = tSnap.data() || {};

        const players = t.players || [];

        // 1️⃣ Clear each player's sold status
        for (const pid of players) {
            await db.collection("players").doc(pid).update({
                soldTo: null,
                soldPrice: null
            });
        }

        // 2️⃣ Reset the selected team's purse & players
        await tRef.update({
            purse: INITIAL_PURSE,
            players: []
        });

        // 3️⃣ Add to logs
        await db.collection("logs").add({
            text: `Admin reset team ${team}`,
            ts: Date.now()
        });
        // 4️⃣ Delete logs related to this team
const logSnap = await db.collection("logs")
    .where("text", ">=", `${team}`)
    .where("text", "<=", `${team}\uf8ff`)
    .get();

logSnap.forEach(doc => doc.ref.delete());


        msg.style.color = "#00ff88";
        msg.innerText = `✔ ${team} reset successfully!`;
        setTimeout(() => {
    msg.innerText = "";
}, 3000);   // 3 seconds


        loadTeams();
        loadPlayers();

        setTimeout(() => msg.innerText = "", 3000);

    } catch (err) {
        msg.style.color = "tomato";
        msg.innerText = "Error: " + err.message;
    }
};


// initial data load
loadPlayers();
loadTeams();