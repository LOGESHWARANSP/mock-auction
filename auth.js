// js/auth.js
// Firebase must be loaded first (firebase.js)

// Inputs
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const msg = document.getElementById('msg');

// REGISTER IS NOT USED NOW
// (You only login teams created manually in Firebase Authentication)

// LOGIN
if(loginBtn) loginBtn.addEventListener('click', async () => {

  const email = emailInput.value.trim();
  const pw = passInput.value;

  if(!email || !pw) {
    msg.innerText = "Enter email & password";
    return;
  }

  try {
    // Firebase login
    await firebase.auth().signInWithEmailAndPassword(email, pw);

    // Map email → TEAM NAME (IPS team codes)
    let team = "";

    switch(email.toLowerCase()) {
      case "csk@gmail.com": team = "CSK"; break;
      case "mi@gmail.com": team = "MI"; break;
      case "rcb@gmail.com": team = "RCB"; break;
      case "kkr@gmail.com": team = "KKR"; break;
      case "srh@gmail.com": team = "SRH"; break;
      case "dc@gmail.com": team = "DC"; break;
      case "rr@gmail.com": team = "RR"; break;
      case "gt@gmail.com": team = "GT"; break;
      case "lsg@gmail.com": team = "LSG"; break;
      case "pk@gmail.com": team = "PBKS"; break;

      // ADMIN ACCOUNT (if any)
      case "admin@gmail.com":
        window.location.href = "admin.html";
        return;
    }

    // If email not matched
    if (team === "") {
      alert("This email is not linked to any IPL team!");
      return;
    }

    // Save team for team.html
    localStorage.setItem("team", team);

    // Redirect to team dashboard
    window.location.href = "team.html";

  } catch(e) {
    msg.innerText = e.message;
  }
});
