import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  getDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Data types for therapy sessions
export interface TherapyMessage {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Timestamp;
  isAudio?: boolean;
  audioUrl?: string; // For storing audio file URLs
  transcription?: string; // For voice messages
  doctorId?: string;
}

export interface TherapySession {
  id: string;
  userId: string;
  sessionType: 'text' | 'voice';
  doctorId?: string;
  startTime: Timestamp;
  lastActivity: Timestamp;
  messageCount: number;
  status: 'active' | 'completed';
}

// Create a new therapy session
export const createTherapySession = async (
  userId: string, 
  sessionType: 'text' | 'voice', 
  doctorId?: string
): Promise<string> => {
  try {
    const sessionData: Omit<TherapySession, 'id'> = {
      userId,
      sessionType,
      doctorId,
      startTime: serverTimestamp() as Timestamp,
      lastActivity: serverTimestamp() as Timestamp,
      messageCount: 0,
      status: 'active'
    };

    const docRef = await addDoc(collection(db, 'therapy_sessions'), sessionData);
    console.log('✅ Therapy session created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating therapy session:', error);
    throw error;
  }
};

// Add a message to a therapy session
export const addMessageToSession = async (
  sessionId: string,
  message: Omit<TherapyMessage, 'id'>
): Promise<string> => {
  try {
    // Add message to messages subcollection
    const messageRef = await addDoc(
      collection(db, 'therapy_sessions', sessionId, 'messages'), 
      {
        ...message,
        timestamp: serverTimestamp()
      }
    );

    // Update session metadata
    const sessionRef = doc(db, 'therapy_sessions', sessionId);
    await updateDoc(sessionRef, {
      lastActivity: serverTimestamp(),
      messageCount: await getMessageCount(sessionId) + 1
    });

    console.log('✅ Message added to session:', messageRef.id);
    return messageRef.id;
  } catch (error) {
    console.error('❌ Error adding message:', error);
    throw error;
  }
};

// Get message count for a session
const getMessageCount = async (sessionId: string): Promise<number> => {
  try {
    const messagesRef = collection(db, 'therapy_sessions', sessionId, 'messages');
    const q = query(messagesRef);
    
    return new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        resolve(snapshot.size);
        unsubscribe();
      });
    });
  } catch (error) {
    console.error('❌ Error getting message count:', error);
    return 0;
  }
};

// Listen to messages in a therapy session
export const subscribeToSessionMessages = (
  sessionId: string,
  callback: (messages: TherapyMessage[]) => void
): (() => void) => {
  const messagesRef = collection(db, 'therapy_sessions', sessionId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages: TherapyMessage[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TherapyMessage[];
    
    callback(messages);
  }, (error) => {
    console.error('❌ Error listening to messages:', error);
  });
};

// Get user's therapy sessions
export const getUserSessions = (
  userId: string,
  callback: (sessions: TherapySession[]) => void
): (() => void) => {
  const sessionsRef = collection(db, 'therapy_sessions');
  const q = query(
    sessionsRef, 
    where('userId', '==', userId),
    orderBy('lastActivity', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const sessions: TherapySession[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TherapySession[];
    
    callback(sessions);
  }, (error) => {
    console.error('❌ Error getting user sessions:', error);
  });
};

// End a therapy session
export const endTherapySession = async (sessionId: string): Promise<void> => {
  try {
    const sessionRef = doc(db, 'therapy_sessions', sessionId);
    await updateDoc(sessionRef, {
      status: 'completed',
      lastActivity: serverTimestamp()
    });
    
    console.log('✅ Therapy session ended:', sessionId);
  } catch (error) {
    console.error('❌ Error ending session:', error);
    throw error;
  }
};

// Store audio file reference (for voice messages)
export const storeAudioReference = async (
  sessionId: string,
  messageId: string,
  audioUrl: string
): Promise<void> => {
  try {
    const messageRef = doc(db, 'therapy_sessions', sessionId, 'messages', messageId);
    await updateDoc(messageRef, {
      audioUrl
    });
    
    console.log('✅ Audio reference stored for message:', messageId);
  } catch (error) {
    console.error('❌ Error storing audio reference:', error);
    throw error;
  }
};

// Analytics and insights
export const getSessionAnalytics = async (userId: string) => {
  try {
    const sessionsRef = collection(db, 'therapy_sessions');
    const q = query(sessionsRef, where('userId', '==', userId));
    
    return new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(doc => doc.data());
        
        const analytics = {
          totalSessions: sessions.length,
          textSessions: sessions.filter(s => s.sessionType === 'text').length,
          voiceSessions: sessions.filter(s => s.sessionType === 'voice').length,
          totalMessages: sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0),
          favoriteDoctor: getMostFrequentDoctor(sessions),
          averageSessionLength: calculateAverageSessionLength(sessions)
        };
        
        resolve(analytics);
        unsubscribe();
      });
    });
  } catch (error) {
    console.error('❌ Error getting analytics:', error);
    return null;
  }
};

const getMostFrequentDoctor = (sessions: any[]): string | null => {
  const doctorCounts: { [key: string]: number } = {};
  
  sessions.forEach(session => {
    if (session.doctorId) {
      doctorCounts[session.doctorId] = (doctorCounts[session.doctorId] || 0) + 1;
    }
  });
  
  return Object.keys(doctorCounts).reduce((a, b) => 
    doctorCounts[a] > doctorCounts[b] ? a : b, 
    null
  );
};

const calculateAverageSessionLength = (sessions: any[]): number => {
  const completedSessions = sessions.filter(s => s.status === 'completed');
  
  if (completedSessions.length === 0) return 0;
  
  const totalDuration = completedSessions.reduce((sum, session) => {
    if (session.startTime && session.lastActivity) {
      const duration = session.lastActivity.toMillis() - session.startTime.toMillis();
      return sum + duration;
    }
    return sum;
  }, 0);
  
  return Math.round(totalDuration / completedSessions.length / 1000 / 60); // Return in minutes
}; 