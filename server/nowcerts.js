import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const getAccessToken = async () => {
  const data = new URLSearchParams();
  data.append('grant_type', 'password');
  data.append('username', process.env.NOWCERTS_USERNAME);
  data.append('password', process.env.NOWCERTS_PASSWORD);
  data.append('client_id', process.env.NOWCERTS_CLIENT_ID);

  try {
    const response = await axios.post('https://api.nowcerts.com/api/token', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

export { getAccessToken };
