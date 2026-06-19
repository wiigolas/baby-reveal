import { initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAKBhJ2AErx5Toe1hKsotGpUekqkifwVUg",
  authDomain: "babyshowersite.firebaseapp.com",
  projectId: "babyshowersite",
  storageBucket: "babyshowersite.firebasestorage.app",
  messagingSenderId: "10800537641",
  appId: "1:10800537641:web:9bc1d1e19414afeb6e7c38",
}

const app = initializeApp(firebaseConfig)

// Use long-polling transport — more reliable than WebSocket in production
// environments (avoids Vite bundle issues with Firebase's WebSocket worker).
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
})
