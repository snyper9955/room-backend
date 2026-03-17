const axios = require('axios');

async function testAddRoom() {
  try {
    const response = await axios.post('http://localhost:5000/api/rooms', {
      roomNumber: '111',
      price: 5000,
      type: 'Single',
      amenities: ['WiFi'],
      description: 'Test room description'
    });
    console.log('SUCCESS:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('ERROR STATUS:', error.response.status);
      console.log('ERROR DATA:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('ERROR MESSAGE:', error.message);
    }
  }
}

testAddRoom();
