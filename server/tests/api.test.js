const request = require("supertest");
const app = require("../app");
const pool = require("../config/db");

const stamp = Date.now();
const userA = { name: "Test A", email: `a${stamp}@test.com`, password: "123456" };
const userB = { name: "Test B", email: `b${stamp}@test.com`, password: "123456" };
const DATE = "2026-01-10";
let tokenA, tokenB, readingId;

async function registerAndLogin(user) {
  await request(app).post("/auth/register").send(user);
  const res = await request(app)
    .post("/auth/login")
    .send({ email: user.email, password: user.password });
  return res.body.token;
}

function add(token, body) {
  return request(app)
    .post("/readings")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

beforeAll(async () => {
  tokenA = await registerAndLogin(userA);
  tokenB = await registerAndLogin(userB);
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = ANY($1)", [
    [userA.email, userB.email],
  ]);
  await pool.end();
});

describe("auth", () => {
  test("duplicate email is rejected", async () => {
    const res = await request(app).post("/auth/register").send(userA);
    expect(res.status).toBe(409);
  });

  test("wrong password is rejected", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: userA.email, password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  test("readings need a token", async () => {
    const res = await request(app).get("/readings");
    expect(res.status).toBe(401);
  });
});

describe("reading validation", () => {
  test("valid reading is saved", async () => {
    const res = await add(tokenA, { reading_date: DATE, slot: "morning", value: 100 });
    expect(res.status).toBe(201);
    readingId = res.body.id;
  });

  test("same slot twice on one day is rejected", async () => {
    const res = await add(tokenA, { reading_date: DATE, slot: "morning", value: 105 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("You already have a Morning reading for this date.");
  });

  test("value outside 40-600 is rejected", async () => {
    const res = await add(tokenA, { reading_date: DATE, slot: "after_lunch", value: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Value must be between 40 and 600 mg/dl.");
  });

  test("missing value is rejected", async () => {
    const res = await add(tokenA, { reading_date: DATE, slot: "after_lunch" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Please enter a glucose value.");
  });

  test("future date is rejected", async () => {
    const res = await add(tokenA, { reading_date: "2999-01-01", slot: "morning", value: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Date cannot be in the future.");
  });

  test("a 5th reading in one day is rejected", async () => {
    await add(tokenA, { reading_date: DATE, slot: "after_breakfast", value: 110 });
    await add(tokenA, { reading_date: DATE, slot: "after_lunch", value: 120 });
    await add(tokenA, { reading_date: DATE, slot: "after_dinner", value: 130 });
    const res = await add(tokenA, { reading_date: DATE, slot: "morning", value: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("You can add only 4 readings per day.");
  });
});

describe("privacy", () => {
  test("another user sees no readings", async () => {
    const res = await request(app)
      .get("/readings")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("another user cannot delete my reading", async () => {
    const res = await request(app)
      .delete(`/readings/${readingId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });
});

describe("reports", () => {
  test("daily report has correct numbers", async () => {
    const res = await request(app)
      .get(`/reports?type=daily&date=${DATE}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(4);
    expect(res.body.highest).toBe(130);
    expect(res.body.lowest).toBe(100);
    expect(res.body.average).toBe(115);
  });

  test("report with no readings is empty", async () => {
    const res = await request(app)
      .get(`/reports?type=daily&date=${DATE}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.body.empty).toBe(true);
    expect(res.body.count).toBe(0);
  });
});