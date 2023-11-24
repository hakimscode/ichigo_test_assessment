import express, { Request, Response } from 'express';
import moment from 'moment';
import { Rewards, RewardsParam, RewardsQuery } from 'types';

const app = express();
app.use(express.urlencoded({extended: true}))
app.use(express.json())

/*
? In Memory Database using Map
? Key of the map will use the id of User
? Assume rewards only for current week, so every user just have 1 list rewards active (full of week) 
*/
const db = new Map()

app.get('/', (req: Request, res: Response) => {
  res.send('Rewards API')
})

app.get('/users/:id/rewards', (req: Request<RewardsParam, unknown, unknown, RewardsQuery>, res: Response) => {
  const params = req.params
  const query = req.query

  const { id } = params

  if (db.has(id)) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200
    res.send({data: db.get(id)})
    return
  }
  
  const { at } = query

  const startWeek = moment(at).utcOffset(0).startOf('isoWeek').toISOString();

  let data: Rewards[] = []

  for(let i=0; i < 7; i++) {
    const date = moment(startWeek)
    const dateNext = date.add(i, 'day')
    const rewardNext: Rewards = {
      availableAt: dateNext.toISOString(),
      redeemedAt: null,
      expiresAt: dateNext.add(1, 'day').toISOString()
    }
    data.push(rewardNext);
  }

  db.set(id, data);

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.send({data: db.get(id)})
})

app.patch('/users/:id/rewards/:redeemParam/redeem', (req: Request<RewardsParam, unknown, unknown, unknown>, res: Response) => {
  const params = req.params

  const { id, redeemParam } = params

  if (!db.has(id)) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 404
    res.send({error: {message: "User not found"}})
    return
  }

  const currentDate = moment().utc(true)
  const rewards: Rewards[] = db.get(id)

  for (const [key, reward] of rewards.entries()) {
    if (redeemParam === reward.availableAt) {
      const expires = moment(reward.expiresAt)
  
      if (currentDate.isBefore(expires) && reward.redeemedAt === null) {
        let newReward: Rewards = {
          availableAt: reward.availableAt,
          redeemedAt: currentDate.toISOString(),
          expiresAt: reward.expiresAt
        }

        rewards[key] = newReward

        db.set(id, rewards)

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 202
        res.send({data: newReward})
        return
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 400
        res.send({error: {message: "This reward is already expired"}})
        return
      }
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 404
  res.send({error: {message: "Rewards not found"}})
})

export default app;
