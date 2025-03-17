import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyC-RcxJJR-88NHyBhhmHGomwbDt8Q3uWAQ",
    authDomain: "battleships-5846f.firebaseapp.com",
    databaseURL: "https://battleships-5846f-default-rtdb.firebaseio.com",
    projectId: "battleships-5846f",
    storageBucket: "battleships-5846f.appspot.com",
    messagingSenderId: "234822512903",
    appId: "1:234822512903:web:2f833aee3436318d7915a2"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };