#!/usr/bin/env node

/**
 * Test Fenris with the access token we know works
 */

import axios from 'axios';

const ACCESS_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJuMXFQMTB5OUIxbDhKUTBOa0pmTm1FbE9yUnAzQ0p3UXc3UDdLVjZOQ1JRIn0.eyJleHAiOjE3NjEzMjc1NzEsImlhdCI6MTc2MTIzNzU3MSwianRpIjoidHJydGNjOmYxZGM0NjBhLWJiZTYtOGZmYy1kMGExLTNmYThhNjQ3YWU2NyIsImlzcyI6Imh0dHBzOi8vYXV0aC5mZW5yaXNkLmNvbS9yZWFsbXMvZmVucmlzIiwic3ViIjoiOGZiYzFlODAtMTk1OS00NzY1LTg0MmYtMjI5NTc0MjBhY2ViIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibzc4N2N1ZTBzaW1uYTZzMWduZ284MGs2NiIsInNjb3BlIjoiYml0ZnJvc3QvcG9zdCIsImNsaWVudEhvc3QiOiI3Ni4xMTQuNjkuNDYiLCJjbGllbnRBZGRyZXNzIjoiNzYuMTE0LjY5LjQ2IiwiY2xpZW50X2lkIjoibzc4N2N1ZTBzaW1uYTZzMWduZ284MGs2NiJ9.THrbfvPufyoTNkP7win6rACkgBxEF-b8InPSGc5jUWxuhyA12hptM52FMse4dGkxs6OnxNYVGbHN44bWEaVOHKIGTQObUhXuU-ms2Q_ftiS7NeamYZd47O7B1aa-9IcCw0IQmyNgHPE5zwTqz7aMNUVUpCYw6iIt7Ujc7mrlSl-k0t4OOj_cm2HbmAHWM-89QN5gGD18b1G-f49hu2v2ygJvi6e3Kv1oFx0Uj1WVCvAgW3FJ4-O2FQNF1aNZKg7yPuksFwPiGVm-_ZdtMqvDdcuoS2aEZMaG1sbbL7Lar8XJhjNl6uNV5G3lCkb3d4cGzb7EyGuOhAeXNgvh8vafhA";

const TEST_DATA = {
  responseType: "C",
  person: {
    firstName: "Kyle",
    middleName: "",
    lastName: "Murdock",
    dateOfBirth: "05/20/1970"
  },
  address: {
    addressLine1: "18595 Old Aldrin Highway",
    addressLine2: "",
    city: "HIGHLANDS RANCH",
    state: "CO",
    zipCode: "80126"
  }
};

async function testFenrisAPI() {
  console.log('Testing Fenris API with known good token...\n');

  try {
    const response = await axios.post(
      "https://api.fenrisd.com/services/personal/v1/autoprefill/search",
      TEST_DATA,
      {
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "products": "Personal",
          "Request-Id": `test-${Date.now()}`,
        },
      }
    );

    console.log('✅ SUCCESS!');
    console.log('\nFenris Response:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(response.data, null, 2));
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ FAILED');
    console.error(`Status: ${error.response?.status}`);
    console.error(`Message: ${error.message}`);
    console.error(`Response:`, JSON.stringify(error.response?.data, null, 2));
  }
}

testFenrisAPI();
