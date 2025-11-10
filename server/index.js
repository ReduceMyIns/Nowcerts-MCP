import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { getAccessToken } from './nowcerts.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('ReduceMyInsurance.Net API is running!');
});

app.get('/api/policies', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const customerId = 'YOUR_CUSTOMER_ID'; // This should be dynamic in a real application

    const response = await axios.get(`https://api.nowcerts.com/api/Insurance/Policies?insuredId=${customerId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
