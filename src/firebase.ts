import { 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth, db, storage } from './lib/firebase';

export { auth, db, storage };

export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const signupWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);
