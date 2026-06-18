import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAKBhJ2AErx5Toe1hKsotGpUekqkifwVUg",
  authDomain: "babyshowersite.firebaseapp.com",
  projectId: "babyshowersite",
  storageBucket: "babyshowersite.firebasestorage.app",
  messagingSenderId: "10800537641",
  appId: "1:10800537641:web:9bc1d1e19414afeb6e7c38",
  measurementId: "G-H2KRX49LBW"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
