// firebase.js

const firebaseConfig = {
  apiKey: "AIzaSyB65CPz-PKiBbgLs0Xang8jb4dzMswRHco",
  authDomain: "mock-auction-ee4ee.firebaseapp.com",
  projectId: "mock-auction-ee4ee",
  storageBucket: "mock-auction-ee4ee.appspot.com",
  messagingSenderId: "417616243280",
  appId: "1:417616243280:web:0ec9581b943bfaf1ebff55"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
