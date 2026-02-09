import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const verifyAttendance = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/verify-attendance`, data);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    if (error.response) {
       // If API returns 400/something logic error structure
       return error.response.data;
    }
    throw error;
  }
};
