import { describe, test, expect } from "bun:test";
import { api, expectStatus, createTestFile } from "./helpers";

describe("API Integration Tests", () => {
  let pollId: string;
  let fourOptionPollId: string;
  let collectionId: string;

  // Collections Tests
  test("Create a collection", async () => {
    const res = await api("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sports Polls",
        description: "A collection of sports-related polls",
        color: "#FF0000",
        emoji: "⚽",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe("Sports Polls");
    expect(data.description).toBe("A collection of sports-related polls");
    expect(data.color).toBe("#FF0000");
    expect(data.emoji).toBe("⚽");
    collectionId = data.id;
  });

  test("List all collections", async () => {
    const res = await api("/api/collections");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.collections).toBeDefined();
    expect(Array.isArray(data.collections)).toBe(true);
  });

  test("Get collection by ID", async () => {
    const res = await api(`/api/collections/${collectionId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(collectionId);
    expect(data.name).toBe("Sports Polls");
  });

  test("Get collection by nonexistent ID", async () => {
    const res = await api("/api/collections/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  test("Update a collection", async () => {
    const res = await api(`/api/collections/${collectionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sports Polls Updated",
        color: "#0000FF",
        emoji: "🏆",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(collectionId);
    expect(data.name).toBe("Sports Polls Updated");
    expect(data.color).toBe("#0000FF");
    expect(data.emoji).toBe("🏆");
  });

  test("Update a nonexistent collection", async () => {
    const res = await api("/api/collections/00000000-0000-0000-0000-000000000000", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Name",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Create collection with minimum required fields", async () => {
    const res = await api("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Minimal Collection",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe("Minimal Collection");
  });

  test("Create collection without required name field", async () => {
    const res = await api("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Missing name",
        color: "#FF0000",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Delete a collection", async () => {
    const res = await api(`/api/collections/${collectionId}`, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Verify collection is deleted", async () => {
    const res = await api(`/api/collections/${collectionId}`);
    await expectStatus(res, 404);
  });

  test("Delete a nonexistent collection", async () => {
    const res = await api("/api/collections/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });

  // Polls Tests
  test("Create a poll", async () => {
    const res = await api("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Should we use TypeScript?",
        description: "A poll about TypeScript adoption",
        option_a_label: "Yes",
        option_b_label: "No",
        option_a_emoji: "✅",
        option_b_emoji: "❌",
        is_active: true,
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.title).toBe("Should we use TypeScript?");
    pollId = data.id;
  });

  test("List all polls", async () => {
    const res = await api("/api/polls");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.polls).toBeDefined();
    expect(Array.isArray(data.polls)).toBe(true);
  });

  test("Get poll by ID", async () => {
    const res = await api(`/api/polls/${pollId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(pollId);
    expect(data.counts).toBeDefined();
    expect(data.counts.a).toBe(0);
    expect(data.counts.b).toBe(0);
    expect(data.counts.total).toBe(0);
  });

  test("Get poll by nonexistent ID", async () => {
    const res = await api("/api/polls/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  test("Get active poll", async () => {
    const res = await api("/api/polls/active");
    // Could return 200 if an active poll exists, or 404 if none
    await expectStatus(res, 200, 404);
    if (res.status === 200) {
      const data = await res.json();
      expect(data.counts).toBeDefined();
      expect(data.is_active).toBe(true);
    }
  });

  test("Assign a poll to a collection", async () => {
    // Create a collection for this test
    const collRes = await api("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Collection for Assignment",
      }),
    });
    const collection = await collRes.json();

    // Assign poll to collection
    const res = await api(`/api/polls/${pollId}/collection`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_id: collection.id,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.poll.collection_id).toBe(collection.id);
  });

  test("Unassign a poll from a collection", async () => {
    // Create a collection
    const collRes = await api("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Collection for Unassign",
      }),
    });
    const collection = await collRes.json();

    // Assign poll to collection
    await api(`/api/polls/${pollId}/collection`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_id: collection.id,
      }),
    });

    // Unassign (set collection_id to null)
    const res = await api(`/api/polls/${pollId}/collection`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_id: null,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.poll.collection_id).toBeNull();
  });

  test("Filter polls by collection_id", async () => {
    // Create a collection
    const collRes = await api("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Collection for Filter",
      }),
    });
    const collection = await collRes.json();

    // Create a new poll
    const pollRes = await api("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Poll for Collection Filter",
      }),
    });
    const poll = await pollRes.json();

    // Assign poll to collection
    await api(`/api/polls/${poll.id}/collection`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_id: collection.id,
      }),
    });

    // Filter by collection_id
    const res = await api(`/api/polls?collection_id=${collection.id}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.polls)).toBe(true);
    expect(data.polls.some((p: any) => p.id === poll.id)).toBe(true);
  });

  test("Assign poll to nonexistent poll (404)", async () => {
    const res = await api(`/api/polls/00000000-0000-0000-0000-000000000000/collection`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_id: "550e8400-e29b-41d4-a716-446655440000",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Cast a vote", async () => {
    const res = await api(`/api/polls/${pollId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choice: "a",
        voter_name: "Alice",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.counts).toBeDefined();
    expect(data.counts.a).toBe(1);
    expect(data.counts.total).toBe(1);
  });

  test("Cast another vote", async () => {
    const res = await api(`/api/polls/${pollId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choice: "b",
        voter_name: "Bob",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.counts.total).toBe(2);
  });

  test("Cast vote without required choice field", async () => {
    const res = await api(`/api/polls/${pollId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voter_name: "Charlie",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Cast vote with invalid choice value", async () => {
    const res = await api(`/api/polls/${pollId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choice: "e",
        voter_name: "David",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Cast vote on nonexistent poll", async () => {
    const res = await api("/api/polls/00000000-0000-0000-0000-000000000000/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choice: "a",
        voter_name: "Charlie",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Update a poll", async () => {
    const res = await api(`/api/polls/${pollId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Should we use TypeScript? (Updated)",
        is_active: false,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(pollId);
    expect(data.title).toBe("Should we use TypeScript? (Updated)");
  });

  test("Reset votes", async () => {
    const res = await api(`/api/polls/${pollId}/reset`, {
      method: "POST",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Verify votes were reset", async () => {
    const res = await api(`/api/polls/${pollId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.counts.total).toBe(0);
  });

  test("Delete a poll", async () => {
    const res = await api(`/api/polls/${pollId}`, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Verify poll is deleted", async () => {
    const res = await api(`/api/polls/${pollId}`);
    await expectStatus(res, 404);
  });

  test("Update a nonexistent poll", async () => {
    const res = await api("/api/polls/00000000-0000-0000-0000-000000000000", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated Title",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Reset votes on a nonexistent poll", async () => {
    const res = await api("/api/polls/00000000-0000-0000-0000-000000000000/reset", {
      method: "POST",
    });
    await expectStatus(res, 404);
  });

  test("Delete a nonexistent poll", async () => {
    const res = await api("/api/polls/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });

  test("Create poll with minimum required fields", async () => {
    const res = await api("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Minimal Poll",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  test("Create poll without required title field", async () => {
    const res = await api("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "No title provided",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create poll with all four options", async () => {
    const res = await api("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Four Options Poll",
        option_a_label: "Option A",
        option_b_label: "Option B",
        option_c_label: "Option C",
        option_d_label: "Option D",
        option_a_emoji: "🅰️",
        option_b_emoji: "🅱️",
        option_c_emoji: "©️",
        option_d_emoji: "🅳",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.option_c_label).toBe("Option C");
    expect(data.option_d_label).toBe("Option D");
    fourOptionPollId = data.id;
  });

  test("Vote on option C", async () => {
    const res = await api(`/api/polls/${fourOptionPollId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choice: "c",
        voter_name: "Eve",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.counts.c).toBe(1);
  });

  test("Vote on option D", async () => {
    const res = await api(`/api/polls/${fourOptionPollId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choice: "d",
        voter_name: "Frank",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.counts.d).toBe(1);
  });

  test("Upload a file", async () => {
    const form = new FormData();
    form.append("file", createTestFile());
    const res = await api("/api/upload", {
      method: "POST",
      body: form,
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.url).toBeDefined();
  });

  test("Upload without file", async () => {
    const form = new FormData();
    const res = await api("/api/upload", {
      method: "POST",
      body: form,
    });
    await expectStatus(res, 400);
  });
});
