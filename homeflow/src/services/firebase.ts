/**
 * Firebase Client SDK initialization for HomeFlow.
 * This config is safe to include in client code (public Firebase config).
 */

import {initializeApp, getApps, getApp} from "firebase/app";
import {getFirestore} from "firebase/firestore";

const firebaseConfig = {
  projectId: "streamsync-8ae79",
  appId: "1:295202330543:web:413b0d596e0ccb7b97015a",
  storageBucket: "streamsync-8ae79.firebasestorage.app",
  apiKey: "AIzaSyCA2UXlewWfadoemw4EinfMLyif6PgPyj4",
  authDomain: "streamsync-8ae79.firebaseapp.com",
  messagingSenderId: "295202330543",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
