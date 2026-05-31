import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db, googleProvider } from "../config/firebase";

export const USER_ROLES = Object.freeze({
  VISITOR: "visitor",
  GENERAL_MEMBER: "general_member",
  ADMIN: "admin",
  EXECUTIVE: "executive",
});

const AuthContext = createContext(null);

function normalizeRole(role) {
  if (Object.values(USER_ROLES).includes(role)) {
    return role;
  }

  return USER_ROLES.VISITOR;
}

function buildAuthState(firebaseUser, memberDoc) {
  const role = normalizeRole(memberDoc?.role);
  const status = memberDoc?.status || "inactive";
  const isActiveMember = Boolean(firebaseUser && status === "active");
  const isAdmin = role === USER_ROLES.ADMIN;
  const isExecutive = role === USER_ROLES.EXECUTIVE;

  return {
    firebaseUser,
    member: memberDoc,
    uid: firebaseUser?.uid || null,
    email: firebaseUser?.email || memberDoc?.email || "",
    displayName:
      memberDoc?.fullName || firebaseUser?.displayName || memberDoc?.banglaName || "",
    photoURL: memberDoc?.photoURL || firebaseUser?.photoURL || "",
    role,
    status,
    isAuthenticated: Boolean(firebaseUser),
    isVisitor: !firebaseUser,
    isGeneralMember: role === USER_ROLES.GENERAL_MEMBER && isActiveMember,
    isAdmin,
    isExecutive,
    isCommittee: (isAdmin || isExecutive) && isActiveMember,
    isActiveMember,
  };
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [member, setMember] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Heartbeat: Update lastSeen every 5 minutes if member is active
  useEffect(() => {
    if (!firebaseUser || !member || member.status !== "active") return;

    const updateLastSeen = async () => {
      try {
        await updateDoc(doc(db, "members", firebaseUser.uid), {
          lastSeen: serverTimestamp()
        });
        console.log("Heartbeat: updated lastSeen");
      } catch (err) {
        console.warn("Heartbeat failed:", err);
      }
    };
    
    // Initial update
    updateLastSeen();

    const interval = setInterval(updateLastSeen, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [firebaseUser, member?.id, member?.status]);

  useEffect(() => {
    let unsubscribeMember = null;

    setPersistence(auth, browserLocalPersistence).catch((error) => {
      setAuthError(error);
    });

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (unsubscribeMember) {
          unsubscribeMember();
          unsubscribeMember = null;
        }

        setFirebaseUser(currentUser);
        setMember(null);
        setAuthError(null);

        if (!currentUser) {
          setAuthLoading(false);
          setMemberLoading(false);
          return;
        }

        setAuthLoading(false);
        setMemberLoading(true);

        const memberRef = doc(db, "members", currentUser.uid);

        unsubscribeMember = onSnapshot(
          memberRef,
          async (snapshot) => {
            console.log("Member snapshot update:", snapshot.exists() ? "Exists" : "Not Found");
            if (snapshot.exists()) {
              const data = snapshot.data();
              console.log("Member status:", data.status);
              // Existing member document found. Ensure photoURL is synced from Firebase auth if missing.
              if (!data.photoURL && currentUser?.photoURL) {
                // Update Firestore with the photoURL from Google sign-in.
                await setDoc(doc(db, "members", currentUser.uid), { ...data, photoURL: currentUser.photoURL }, { merge: true });
                console.log("Synced member photoURL from Google auth.");
              }
              setMember({
                id: snapshot.id,
                uid: snapshot.id,
                ...data,
              });
              setMemberLoading(false);
            } else {
              // No member document exists for this UID. Check if there is a pre-created member document by email.
              try {
                const userEmail = currentUser.email?.toLowerCase();
                if (userEmail) {
                  console.log("Searching for pre-created member by email:", userEmail);
                  const q = query(
                    collection(db, "members"),
                    where("email", "==", userEmail)
                  );
                  const querySnapshot = await getDocs(q);

                  if (!querySnapshot.empty) {
                    const existingDoc = querySnapshot.docs[0];
                    if (existingDoc.id !== currentUser.uid) {
                      console.log("Found pre-approved member. Linking...");
                      const memberData = existingDoc.data();
                      
                      // Link the account: save under currentUser.uid
                      await setDoc(doc(db, "members", currentUser.uid), {
                        ...memberData,
                        uid: currentUser.uid,
                        // Ensure photoURL is updated from Google if it is currently empty
                        photoURL: memberData.photoURL || currentUser.photoURL || "",
                        linkedAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                      });
                      
                      // Delete the temporary document
                      await deleteDoc(doc(db, "members", existingDoc.id));
                      console.log("Linking complete. Waiting for new snapshot.");
                      return; // The next onSnapshot trigger will handle setMemberLoading(false)
                    }
                  } else {
                    console.log("No member record found for this email. Sign out.");
                    setAuthError(new Error("আপনার ইমেইলটি নিবন্ধিত সদস্য হিসেবে তালিকাভুক্ত নয়। দয়া করে অ্যাডমিনের সাথে যোগাযোগ করুন।"));
                    await signOut(auth);
                  }
                } else {
                  setAuthError(new Error("ইমেইল ঠিকানা পাওয়া যায়নি।"));
                  await signOut(auth);
                }
              } catch (err) {
                console.error("Linking/Signout error:", err);
                setAuthError(err);
                await signOut(auth);
              }
              setMember(null);
              setMemberLoading(false);
            }
          },
          (error) => {
            console.error("Member snapshot error:", error);
            setAuthError(error);
            setMember(null);
            setMemberLoading(false);
          }
        );
      },
      (error) => {
        setAuthError(error);
        setFirebaseUser(null);
        setMember(null);
        setAuthLoading(false);
        setMemberLoading(false);
      }
    );

    return () => {
      if (unsubscribeMember) {
        unsubscribeMember();
      }
      unsubscribeAuth();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const authState = useMemo(
    () => buildAuthState(firebaseUser, member),
    [firebaseUser, member]
  );

  const value = useMemo(
    () => ({
      ...authState,
      loading: authLoading || memberLoading,
      authLoading,
      memberLoading,
      authError,
      login,
      loginWithGoogle,
      logout,
    }),
    [
      authState,
      authLoading,
      memberLoading,
      authError,
      login,
      loginWithGoogle,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
