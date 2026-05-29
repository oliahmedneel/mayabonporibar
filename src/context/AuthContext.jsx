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
  signOut,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../config/firebase";

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
          (snapshot) => {
            setMember(
              snapshot.exists()
                ? {
                    id: snapshot.id,
                    uid: snapshot.id,
                    ...snapshot.data(),
                  }
                : null
            );
            setMemberLoading(false);
          },
          (error) => {
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
      logout,
    }),
    [
      authState,
      authLoading,
      memberLoading,
      authError,
      login,
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
