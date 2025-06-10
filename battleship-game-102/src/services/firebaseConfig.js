import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyBndaZf6YxhEHW4OhK2juEwWiGyNoK--b8",
    authDomain: "battleships-eee70.firebaseapp.com",
    databaseURL: "https://battleships-eee70-default-rtdb.firebaseio.com/",
    projectId: "battleships-eee70",
    storageBucket: "battleships-eee70.firebasestorage.app",
    messagingSenderId: "798376945022",
    appId: "1:798376945022:web:f74f1be077c062acee3f2f",
    measurementId: "G-NRYQ3VSP62"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };