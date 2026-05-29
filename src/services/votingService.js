import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { USER_ROLES } from "../context/AuthContext";

const VOTING_COLLECTION = "votingSessions";
const APPLICATIONS_COLLECTION = "applications";
const PARTICIPANTS_COLLECTION = "voters_participated";
const ANONYMOUS_VOTES_COLLECTION = "anonymous_votes";

function assertCommitteeMember(member) {
  const allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.EXECUTIVE];

  if (!member?.uid || member.status !== "active" || !allowedRoles.includes(member.role)) {
    throw new Error("Only admin or executive committee members can perform this action.");
  }
}

function assertActiveMember(member) {
  if (!member?.uid || member.status !== "active") {
    throw new Error("Only active members can vote.");
  }
}

function normalizeChoice(choice) {
  const normalized = String(choice || "").trim().toLowerCase();

  if (!["yes", "no"].includes(normalized)) {
    throw new Error("Vote choice must be yes or no.");
  }

  return normalized;
}

function serializeMemberForParticipation(member) {
  return {
    uid: member.uid,
    memberId: member.uid,
    fullName: member.fullName || member.displayName || "Unnamed Member",
    banglaName: member.banglaName || "",
    photoURL: member.photoURL || "",
    participatedAt: serverTimestamp(),
  };
}

export async function createVotingSession({
  applicationId,
  applicant,
  title,
  description = "",
  createdByMember,
  closesAt = null,
}) {
  assertCommitteeMember(createdByMember);

  if (!applicationId) {
    throw new Error("Application ID is required.");
  }

  if (!applicant?.fullName) {
    throw new Error("Applicant full name is required.");
  }

  const sessionRef = doc(collection(db, VOTING_COLLECTION));
  const applicationRef = doc(db, APPLICATIONS_COLLECTION, applicationId);

  await runTransaction(db, async (transaction) => {
    const applicationSnapshot = await transaction.get(applicationRef);

    if (!applicationSnapshot.exists()) {
      throw new Error("Member application was not found.");
    }

    const application = applicationSnapshot.data();

    if (!["pending", "reviewed"].includes(application.status)) {
      throw new Error("A voting session can only be created for a pending application.");
    }

    transaction.set(sessionRef, {
      applicationId,
      applicant: {
        fullName: applicant.fullName,
        banglaName: applicant.banglaName || "",
        email: applicant.email || "",
        phone: applicant.phone || "",
        photoURL: applicant.photoURL || "",
        bio: applicant.bio || "",
        socialLink: applicant.socialLink || "",
      },
      title: title || `Membership vote for ${applicant.fullName}`,
      description,
      status: "active",
      yesCount: 0,
      noCount: 0,
      totalVotes: 0,
      createdBy: createdByMember.uid,
      createdByName: createdByMember.fullName || createdByMember.displayName || "",
      createdAt: serverTimestamp(),
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      closesAt,
      closedAt: null,
    });

    transaction.update(applicationRef, {
      status: "voting",
      votingSessionId: sessionRef.id,
      updatedAt: serverTimestamp(),
      reviewedBy: createdByMember.uid,
    });
  });

  return sessionRef.id;
}

export async function submitAnonymousVote({ sessionId, choice, member }) {
  assertActiveMember(member);

  if (!sessionId) {
    throw new Error("Voting session ID is required.");
  }

  const normalizedChoice = normalizeChoice(choice);
  const sessionRef = doc(db, VOTING_COLLECTION, sessionId);
  const participantRef = doc(
    db,
    VOTING_COLLECTION,
    sessionId,
    PARTICIPANTS_COLLECTION,
    member.uid
  );
  const anonymousVoteRef = doc(
    collection(db, VOTING_COLLECTION, sessionId, ANONYMOUS_VOTES_COLLECTION)
  );

  await runTransaction(db, async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);

    if (!sessionSnapshot.exists()) {
      throw new Error("Voting session was not found.");
    }

    const session = sessionSnapshot.data();

    if (session.status !== "active") {
      throw new Error("This voting session is not active.");
    }

    const participantSnapshot = await transaction.get(participantRef);

    if (participantSnapshot.exists()) {
      throw new Error("You have already participated in this voting session.");
    }

    transaction.set(participantRef, serializeMemberForParticipation(member));

    transaction.set(anonymousVoteRef, {
      choice: normalizedChoice,
      createdAt: serverTimestamp(),
    });

    transaction.update(sessionRef, {
      yesCount: increment(normalizedChoice === "yes" ? 1 : 0),
      noCount: increment(normalizedChoice === "no" ? 1 : 0),
      totalVotes: increment(1),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function closeVotingSession({ sessionId, closedByMember }) {
  assertCommitteeMember(closedByMember);

  if (!sessionId) {
    throw new Error("Voting session ID is required.");
  }

  await updateDoc(doc(db, VOTING_COLLECTION, sessionId), {
    status: "closed",
    closedAt: serverTimestamp(),
    closedBy: closedByMember.uid,
    updatedAt: serverTimestamp(),
  });
}

export function listenToActiveVotingSessions(callback, onError) {
  const sessionsQuery = query(
    collection(db, VOTING_COLLECTION),
    where("status", "==", "active"),
    orderBy("startedAt", "desc")
  );

  return onSnapshot(
    sessionsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );
    },
    onError
  );
}

export function listenToVotingSessions(callback, onError) {
  const sessionsQuery = query(
    collection(db, VOTING_COLLECTION),
    orderBy("startedAt", "desc")
  );

  return onSnapshot(
    sessionsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );
    },
    onError
  );
}

export function listenToVotingSession(sessionId, callback, onError) {
  if (!sessionId) {
    throw new Error("Voting session ID is required.");
  }

  return onSnapshot(
    doc(db, VOTING_COLLECTION, sessionId),
    (snapshot) => {
      callback(
        snapshot.exists()
          ? {
              id: snapshot.id,
              ...snapshot.data(),
            }
          : null
      );
    },
    onError
  );
}

export function listenToVotingParticipants(sessionId, callback, onError) {
  if (!sessionId) {
    throw new Error("Voting session ID is required.");
  }

  const participantsQuery = query(
    collection(db, VOTING_COLLECTION, sessionId, PARTICIPANTS_COLLECTION),
    orderBy("participatedAt", "desc")
  );

  return onSnapshot(
    participantsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );
    },
    onError
  );
}

export async function getVotingParticipants(sessionId) {
  if (!sessionId) {
    throw new Error("Voting session ID is required.");
  }

  const participantsQuery = query(
    collection(db, VOTING_COLLECTION, sessionId, PARTICIPANTS_COLLECTION),
    orderBy("participatedAt", "desc")
  );
  const snapshot = await getDocs(participantsQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}
