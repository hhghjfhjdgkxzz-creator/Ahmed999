import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCHEreseXhLUBgPCUxoWTjYc8XeAOaNCiY",
    authDomain: "design-svga.firebaseapp.com",
    projectId: "design-svga",
    storageBucket: "design-svga.firebasestorage.app",
    messagingSenderId: "255075636659",
    appId: "1:255075636659:web:7fc736ff19ebde8d1327c6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);