import { describe, test, expect } from "bun:test";
import { api, expectStatus, createTestFile } from "./helpers";

describe("API Integration Tests", () => {
  let pollId: string;

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
