import { db } from "../firebase";
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";

export const CREDIT_COSTS = {
  STORY_GENERATION: 10,
  AUDIO_CONVERSION: 20,
  IMAGE_GENERATION: 5,
  VIDEO_EXPORT: 50,
  VIDEO_PRODUCTION: 50,
};

export const creditService = {
  checkBalance: async (userId: string, cost: number) => {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) throw new Error("User not found");
    
    const credits = userDoc.data().credits || 0;
    return credits >= cost;
  },

  deduct: async (userId: string, cost: number, action: string) => {
    // Safety check for undefined costs
    const finalCost = cost || 0;
    const userRef = doc(db, "users", userId);
    
    // Atomically decrement
    await updateDoc(userRef, {
      credits: increment(-finalCost)
    });

    // Log activity
    await addDoc(collection(db, "activity"), {
      userId,
      action: "CREDIT_DEDUCTION",
      metadata: { cost: finalCost, type: action },
      createdAt: serverTimestamp()
    });

    // Log transaction for finances tab
    await addDoc(collection(db, `users/${userId}/transactions`), {
      description: action.replace(/_/g, ' ').toLowerCase(),
      amount: cost,
      type: 'out',
      createdAt: serverTimestamp()
    });
  }
};
