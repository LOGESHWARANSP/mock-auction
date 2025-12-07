const firebaseConfig = {
  apiKey: "AIzaSyCK2513a9Vw1I_2n3MXKXSHcdHuPX7mNzg",
  authDomain: "auction-eea33.firebaseapp.com",
  projectId: "auction-eea33",
  storageBucket: "auction-eea33.firebasestorage.app",
  messagingSenderId: "888175405800",
  appId: "1:888175405800:web:36691e4f4f2cf97a40375d",
  measurementId: "G-JN1MMYTXMY"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();
