const request = require("supertest");
import { Rewards } from "types";
import app from "../src/app"
import moment from 'moment';

describe("List rewards", () => {
  it("should return list rewards of user 1", async () => {
    const userId = '1';
    const at = '2023-11-23T12:00:00Z';

    const res = await request(app).get(`/users/${userId}/rewards?at=${at}`);
    expect(res.statusCode).toBe(200);

    const resBody = res._body
    expect(resBody.data).toHaveLength(7);

    const data: Rewards[] = resBody.data
    const startWeek = moment(at).utcOffset(0).startOf('isoWeek').toISOString();
    
    for (const [key, item] of data.entries()) {
      expect(item).toHaveProperty('availableAt')
      expect(item).toHaveProperty('redeemedAt')
      expect(item).toHaveProperty('expiresAt')

      const date = moment(startWeek)
      const dateNext = date.add(key, 'day')
      expect(item.availableAt).toEqual(dateNext.toISOString());
      expect(item.expiresAt).toEqual(dateNext.add(1, 'day').toISOString());
    }
  });
});

describe("Redeem a Reward", () => {
  // ? create a new user's rewards list,
  // ? because test will error if using same id for previous test while test is running at the same runtime and same data
  const userId = '2';
  const at = moment().utc(true).toISOString();
  let rewards: Rewards[] = []

  beforeAll(async() => {
    // ? Create a list of rewards for current week
    const res = await request(app).get(`/users/${userId}/rewards?at=${at}`);
    rewards = res._body.data
  })

  it("should redeem a reward", async () => {
    let redeemParam: string = '';

    const currentDate = moment().utc(true)
    // ? find an available date according to time when the test is execute
    for (const reward of rewards) {
      if (currentDate.isAfter(reward.availableAt) && currentDate.isBefore(reward.expiresAt)) {
        redeemParam = reward.availableAt
        return
      }
    }

    const res = await request(app).patch(`/users/${userId}/rewards/${redeemParam}/redeem`);
    expect(res.statusCode).toBe(202);

    const data = res._body.data
    expect(data).toHaveProperty('availableAt');
    expect(data).toHaveProperty('redeemedAt');
    expect(data).toHaveProperty('expiresAt');
  })

  it("return error user not found", async () => {
    const redeemParam = moment().utc(true).toISOString()

    // ? Try to redeem a reward with user id that does not exists
    const res = await request(app).patch(`/users/3/rewards/${redeemParam}/redeem`);
    expect(res.statusCode).toBe(404);

    const data = res._body
    expect(data).toHaveProperty('error');

    const { error } = data
    expect(error.message).toEqual("User not found")
  })

  it("return error rewards not found", async () => {
    // ? Try to redeem a reward with expires date equal to current week -1 day
    // ? this -1 day avoid passed test in the first day of current week
    const redeemParam = moment(rewards[0].availableAt).add(-1, 'day').toISOString()

    const res = await request(app).patch(`/users/${userId}/rewards/${redeemParam}/redeem`);
    expect(res.statusCode).toBe(404);

    const data = res._body
    expect(data).toHaveProperty('error');

    const { error } = data
    expect(error.message).toEqual("Rewards not found")
  })

  it("return error rewards already expired", async () => {
    let redeemParam: string = '';

    const currentDate = moment().utc(true)
    // ? Find an expires date to be param in redeem reward
    for (const reward of rewards) {
      if (currentDate.isBefore(reward.availableAt)) {
        redeemParam = reward.availableAt
        return
      }
    }

    const res = await request(app).patch(`/users/${userId}/rewards/${redeemParam}/redeem`);
    expect(res.statusCode).toBe(400);

    const data = res._body
    expect(data).toHaveProperty('error');

    const { error } = data
    expect(error.message).toEqual("This reward is already expired")
  })
})