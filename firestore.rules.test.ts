// @ts-nocheck
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Note: These tests require the Firebase Emulators to be running.
 * Since we don't have them here, this is a blueprint for the user.
 */

describe("Firestore Security Rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "dreamquest-bedtime-stories",
      firestore: {
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("should deny unauthenticated users to create leaderboard entries", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(addDoc(collection(unauthDb, "leaderboard"), {
      name: "Attacker",
      rate: 1000,
      department: "ambient",
      date: "2026-05-01",
      timestamp: serverTimestamp()
    }));
  });

  it("should allow authenticated users to create valid leaderboard entries", async () => {
    const authDb = testEnv.authenticatedContext("user123").firestore();
    await assertSucceeds(addDoc(collection(authDb, "leaderboard"), {
      name: "Valid User",
      rate: 250,
      department: "ambient",
      date: "2026-05-01",
      timestamp: serverTimestamp()
    }));
  });

  it("should deny invalid leaderboard entries (missing fields)", async () => {
    const authDb = testEnv.authenticatedContext("user123").firestore();
    await assertFails(addDoc(collection(authDb, "leaderboard"), {
      name: "Valid User",
      rate: 250
    }));
  });
});
